import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  typeof import.meta.env.VITE_SUPABASE_URL === 'string'
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : '';

const supabaseAnonKey =
  typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : '';

let supabaseInstance;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Warning: Missing required environment variable(s): ' +
    `${!supabaseUrl ? 'VITE_SUPABASE_URL ' : ''}${!supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : ''}. ` +
    'Returning a proxy Supabase client to prevent application crash.'
  );

  // Return a safe dummy proxy that won't throw when methods are called
  const dummyHandler = {
    get: function(target, prop) {
      if (prop === 'auth') {
        return {
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          signInWithPassword: async () => ({ data: {}, error: new Error('Database offline') }),
          signUp: async () => ({ data: {}, error: new Error('Database offline') }),
          signOut: async () => ({ error: null }),
        };
      }
      return () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: new Error('Database offline') }),
            maybeSingle: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
            single: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
          }),
          order: () => Promise.resolve({ data: [], error: new Error('Database offline') }),
          maybeSingle: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
          single: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
        }),
        insert: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
        update: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
        delete: () => Promise.resolve({ data: null, error: new Error('Database offline') }),
      });
    }
  };
  supabaseInstance = new Proxy({}, dummyHandler);
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseInstance;
