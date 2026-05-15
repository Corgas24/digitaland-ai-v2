import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loginWithEmail, loginWithGoogleToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { error: signInError } = await loginWithEmail(email, password);
    if (signInError) {
      setError(signInError.message || 'Failed to sign in.');
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      const { error: gError } = await loginWithGoogleToken(credentialResponse.credential);
      if (gError) {
        setError(gError.message || 'Google Login failed on server.');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Persuasion Side */}
      <div className="auth-split-left">
        <div className="auth-brand">
          <Link to="/" className="nav-logo">
            <span className="logo-dot" />
            <span>digital<strong>and</strong></span>
            <span className="logo-ext">.ai</span>
          </Link>
        </div>
        
        <div className="auth-persuasion">
          <h2>Welcome back.</h2>
          <p>Access your dashboard to manage API keys, monitor usage, and seamlessly integrate the world's best AI models.</p>
          
          <div className="auth-feature-list">
            <div className="auth-feature-item fade-in-up delay-1">
              <div className="icon"><Zap size={18} /></div>
              <div>
                <strong>300+ Models Available</strong>
                <span>GPT-5.5, Claude 4.7, Gemini, DeepSeek & more.</span>
              </div>
            </div>
            <div className="auth-feature-item fade-in-up delay-2">
              <div className="icon"><Shield size={18} /></div>
              <div>
                <strong>Secure & Transparent</strong>
                <span>Track spending in real-time. No hidden fees.</span>
              </div>
            </div>
            <div className="auth-feature-item fade-in-up delay-3">
              <div className="icon"><Sparkles size={18} /></div>
              <div>
                <strong>Enterprise-Grade Routing</strong>
                <span>Sub-200ms latency with 99.9% guaranteed uptime.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="auth-split-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1>Sign in</h1>
            <p>Enter your details to access your account</p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login was unsuccessful or cancelled.')}
              useOneTap
              width="380"
              theme={document.documentElement.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline'}
              size="large"
              text="continue_with"
              shape="rectangular"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></div>
            <span>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }}></div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>

            <button type="submit" className="btn-solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'} {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
