import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Recognition for mock user in session
        if (session.user.id === 'mock-rooter-id') {
          const savedMock = localStorage.getItem('mock_rooter_data');
          const parsedMock = savedMock ? JSON.parse(savedMock) : null;
          setUser({
            id: 'mock-rooter-id',
            email: 'rooter@digitaland.ai',
            name: 'Admin Account',
            balance: parsedMock?.balance ?? 100,
            apiKeys: parsedMock?.apiKeys ?? [],
            isAdmin: true,
            access_token: 'mock-rooter-token'
          });
          setLoading(false);
        } else {
          loadUserProfile(session.user);
        }
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    // Final safety timeout to prevent white screens
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Separate Effect for Realtime Profile Sync
  useEffect(() => {
    if (!user?.id || user.id === 'mock-rooter-id') return;

    const profileSubscription = supabase
      .channel(`profile-sync-${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${user.id}` 
      }, (payload) => {
        console.log('REALTIME BALANCE SYNC:', payload.new.balance);
        setUser(prev => prev ? { 
          ...prev, 
          balance: payload.new.balance,
          apiKeys: payload.new.api_keys || prev.apiKeys,
          isAdmin: payload.new.is_admin || prev.isAdmin
        } : null);
      })
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [user?.id]);

  const loadUserProfile = async (authUser) => {
    setIsProfileLoading(true);
    try {
      if (authUser.id === 'mock-rooter-id') {
        const savedMock = localStorage.getItem('mock_rooter_data');
        const parsedMock = savedMock ? JSON.parse(savedMock) : null;
        setUser({
          id: 'mock-rooter-id',
          email: 'rooter@digitaland.ai',
          name: 'Admin Account',
          balance: parsedMock?.balance ?? 100,
          apiKeys: parsedMock?.apiKeys ?? [],
          isAdmin: true,
          access_token: 'mock-rooter-token'
        });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error.message);
      }

      // If the profile row doesn't exist yet (e.g. user signed up via OAuth
      // but the post-signup trigger hasn't fired), attempt to create it.
      let userProfileData = data ?? null;
      if (!userProfileData) {
        try {
          const { data: inserted } = await supabase
            .from('profiles')
            .insert({
              id:         authUser.id,
              email:      authUser.email,
              balance:    0,
              api_keys:   [],
              is_admin:   false,
            })
            .select()
            .single();
          userProfileData = inserted ?? null;
        } catch (insertErr) {
          console.error('Could not create missing profile row:', insertErr instanceof Error ? insertErr.message : insertErr);
        }
      }

      const userData = {
        id:         authUser.id,
        email:      authUser.email,
        name:       authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        avatar_url: authUser.user_metadata?.avatar_url ?? null,
        balance:    userProfileData?.balance ?? 0,
        apiKeys:    userProfileData?.api_keys ?? [],
        isAdmin:    userProfileData?.is_admin ?? authUser.email === 'corgasmario@gmail.com',
      };
      
      console.log('DEBUG: User Profile Loaded:', userData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading user profile:', e);
    } finally {
      setIsProfileLoading(false);
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    });
  };

  const loginWithGoogleToken = async (idToken) => {
    return await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
  };

  const loginWithEmail = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email, password, name) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateBalance = async (amount) => {
    if (!user) return;
    const newBalance = user.balance + amount;
    const prevBalance = user.balance;
    setUser(prev => ({ ...prev, balance: newBalance }));

    if (user.id === 'mock-rooter-id') {
      try {
        localStorage.setItem('mock_rooter_data', JSON.stringify({ ...user, balance: newBalance }));
      } catch (e) { /* localStorage unavailable — dev-only fallback */ }
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);
      if (error) {
        // Roll back optimistic UI update
        console.error('[AuthContext] Failed to persist balance update — rolling back UI:', error.message);
        setUser(prev => ({ ...prev, balance: prevBalance }));
      }
    } catch (e) {
      console.error('[AuthContext] Balance persistence error:', e);
      setUser(prev => ({ ...prev, balance: prevBalance }));
    }
  };

  const addApiKey = async (apiKeyData) => {
    if (!user) return;
    const updatedApiKeys = [...user.apiKeys, apiKeyData];
    setUser(prev => ({ ...prev, apiKeys: updatedApiKeys }));

    if (user.id === 'mock-rooter-id') {
      try {
        localStorage.setItem('mock_rooter_data', JSON.stringify({ ...user, apiKeys: updatedApiKeys }));
      } catch (e) {}
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ api_keys: updatedApiKeys })
        .eq('id', user.id);
      if (error) {
        console.error('[AuthContext] Failed to persist new API key — rolling back UI:', error.message);
        setUser(prev => ({ ...prev, apiKeys: user.apiKeys }));
      }
    } catch (e) {
      console.error('[AuthContext] API key persistence error:', e);
      setUser(prev => ({ ...prev, apiKeys: user.apiKeys }));
    }
  };

  const removeApiKey = async (id) => {
    if (!user) return;
    const originalKeys   = user.apiKeys;
    const updatedApiKeys = user.apiKeys.filter(key => key.id !== id);
    setUser(prev => ({ ...prev, apiKeys: updatedApiKeys }));

    if (user.id === 'mock-rooter-id') {
      try {
        localStorage.setItem('mock_rooter_data', JSON.stringify({ ...user, apiKeys: updatedApiKeys }));
      } catch (e) {}
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ api_keys: updatedApiKeys })
        .eq('id', user.id);
      if (error) {
        console.error('[AuthContext] Failed to persist API key removal — rolling back UI:', error.message);
        setUser(prev => ({ ...prev, apiKeys: originalKeys }));
      }
    } catch (e) {
      console.error('[AuthContext] API key removal persistence error:', e);
      setUser(prev => ({ ...prev, apiKeys: originalKeys }));
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      refreshUser,
      loginWithGoogle,
      loginWithGoogleToken,
      loginWithEmail,
      signUp,
      logout, 
      updateBalance,
      addApiKey,
      removeApiKey,
      loading,
      isProfileLoading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return user ? children : null;
};