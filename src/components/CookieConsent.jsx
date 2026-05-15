import React, { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      left: '2rem',
      right: '2rem',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none'
    }}>
      <div className="card fade-in" style={{
        maxWidth: '600px',
        width: '100%',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        pointerEvents: 'all',
        borderRadius: '24px'
      }}>
        <div style={{ 
          background: 'var(--primary-soft)', 
          color: 'var(--primary)', 
          width: '48px', 
          height: '48px', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Shield size={24} />
        </div>
        
        <div style={{ flex: 1 }}>
          <h4 style={{ fontWeight: 800, marginBottom: '0.25rem', fontSize: '1rem' }}>Cookie & Privacy Policy</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            We use cookies to ensure you get the best experience on our platform. By continuing, you agree to our <a href="/legal/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</a>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleAccept} className="btn-solid" style={{ whiteSpace: 'nowrap', padding: '0.6rem 1.25rem' }}>
            Accept All
          </button>
          <button onClick={() => setShow(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
