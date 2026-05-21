import { memo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Icon = {
  Moon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  LogOut: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

const Navbar = memo(function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="nav-logo">
          <span className="logo-dot" />
          <span>digital<strong>and</strong></span>
          <span className="logo-ext">.ai</span>
        </Link>
        
        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/models" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Models</Link>
          <Link to="/pricing" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link to="/docs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
          {user && (
            <>
              <Link to="/playground" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Playground</Link>
              <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            </>
          )}
          {!user && mobileMenuOpen && (
             <div className="auth-group-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
               <Link to="/signin" className="nav-link-signin" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
               <Link to="/playground" className="btn-nav-primary" onClick={() => setMobileMenuOpen(false)}>Get API Key</Link>
             </div>
          )}
        </div>

        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', padding: '0.5rem', borderRadius: '8px' }}>
            {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
          </button>
          
          {user ? (
            <div className="user-dropdown-elite">
              <div className="user-profile-btn" onClick={() => navigate('/dashboard')}>
                <div className="avatar-circle">
                  {user.name ? user.name[0].toUpperCase() : <Icon.User />}
                </div>
                <span className="nav-username">{user.name || user.email.split('@')[0]}</span>
              </div>
              <button className="nav-logout-btn" onClick={() => { logout(); navigate('/'); }} title="Logout">
                <Icon.LogOut />
              </button>
            </div>
          ) : (
            <div className="auth-group-nav">
              <Link to="/signin" className="nav-link-signin">Sign In</Link>
              <Link to="/playground" className="btn-nav-primary">Get API Key</Link>
            </div>
          )}
          
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '1.5rem', marginLeft: '0.5rem', display: 'none' }}>
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
});

export default Navbar;
