import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = window.localStorage.getItem('digitaland_disclaimer_accepted');
    if (!hasAccepted) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    window.localStorage.setItem('digitaland_disclaimer_accepted', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)', zIndex: 99999, // Extremely high to be above everything
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-card card-3d modal-content" style={{
        width: '100%', maxWidth: '550px', padding: '2.5rem',
        position: 'relative', overflow: 'hidden', cursor: 'default',
        borderTop: '4px solid var(--primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <AlertTriangle size={24} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, m: 0 }}>Important Notice</h2>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '2.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>DIGITALAND</strong> is a platform providing access to third-party AI models. We act as a reseller and intermediary, which allows us to offer more competitive prices — but it also means that model availability and response speed partially depend on upstream providers.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            We do our best to ensure a stable service, but we cannot guarantee 100% uptime or consistent response times across all models. In the event of a temporary failure, we apologize for the inconvenience and recommend trying again or switching to an alternative model.
          </p>
          <p>
            Thank you for your understanding. 🙏
          </p>
        </div>

        <button 
          className="magic-btn btn-3d" 
          onClick={handleAccept}
          style={{ width: '100%', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800 }}
        >
          <Check size={20} /> I Understand and Agree
        </button>
      </div>
    </div>
  );
}
