import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Zap, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const { user, signUp, loginWithGoogleToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    
    const { error: signUpError } = await signUp(email, password, name);
    if (signUpError) {
      setError(signUpError.message || 'Failed to create account.');
      setLoading(false);
    } else {
      // Show success message asking to verify email
      setSuccessMsg(true);
      setLoading(false);
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
          <h2>Start building today.</h2>
          <p>Join developers worldwide who use Digitaland.ai to access 300+ frontier models through a single, reliable API.</p>
          
          <div className="auth-feature-list">
            <div className="auth-feature-item fade-in-up delay-1">
              <div className="icon"><Zap size={18} /></div>
              <div>
                <strong>Zero Integration Hassle</strong>
                <span>100% OpenAI compatible. Just change your base URL.</span>
              </div>
            </div>
            <div className="auth-feature-item fade-in-up delay-2">
              <div className="icon"><Shield size={18} /></div>
              <div>
                <strong>Pay As You Go</strong>
                <span>Up to 23% cheaper than official API pricing. No subscriptions.</span>
              </div>
            </div>
            <div className="auth-feature-item fade-in-up delay-3">
              <div className="icon"><Sparkles size={18} /></div>
              <div>
                <strong>Instant Access</strong>
                <span>Sign up and generate your first API key in 30 seconds.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="auth-split-right">
        <div className="auth-form-container">
          
          {successMsg ? (
            <div className="fade-in-up" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle size={32} />
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Check your email</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                We've sent a verification link to <strong>{email}</strong>. Please click the link to activate your account and start building.
              </p>
              <Link to="/signin" className="btn-solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-form-header">
                <h1>Create account</h1>
                <p>Start building with 300+ AI models in minutes</p>
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
                  <label htmlFor="name">Full Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

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
                      minLength={8}
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

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <p className="terms-text">
                  By signing up, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                </p>

                <button type="submit" className="btn-solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'} {!loading && <ArrowRight size={18} />}
                </button>
              </form>

              <p className="auth-switch">
                Already have an account? <Link to="/signin">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
