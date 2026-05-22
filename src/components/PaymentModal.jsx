import React, { useState, useEffect } from 'react';
import { X, Lock, CreditCard, Check, AlertCircle } from 'lucide-react';
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { safeFetch } from '../lib/safeFetch';

const CREDIT_PACKAGES = [
  { amount: 10, price: 10, popular: false },
  { amount: 25, price: 25, popular: false },
  { amount: 50, price: 50, popular: true },
  { amount: 100, price: 100, popular: false },
  { amount: 250, price: 250, popular: false },
  { amount: 500, price: 500, popular: false },
];

export default function PaymentModal({ isOpen, onClose, prefilledAmount }) {
  const { user } = useAuth();
  const [{ isPending: paypalPending, isRejected: paypalRejected }] = usePayPalScriptReducer();
  const [selectedPackage, setSelectedPackage] = useState(prefilledAmount || 50);
  const [customAmount, setCustomAmount] = useState(prefilledAmount ? String(prefilledAmount) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync state when prefilledAmount changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShowSuccess(false);
      setLoading(false);
      if (prefilledAmount) {
        setSelectedPackage(prefilledAmount);
        setCustomAmount(String(prefilledAmount));
      } else {
        setSelectedPackage(50);
        setCustomAmount('');
      }
    }
  }, [isOpen, prefilledAmount]);

  if (!isOpen) return null;

  const currentAmount = customAmount ? parseFloat(customAmount) : selectedPackage;

  const handleStripeCheckout = async () => {
    if (!currentAmount || currentAmount < 5) {
      setError('Please select or enter an amount of at least $5');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const response = await safeFetch(`https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/create-stripe-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ amount: currentAmount, userId: user.id }),
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(`Checkout error: ${err.message}`);
      setLoading(false);
    }
  };

  const createPayPalOrder = async () => {
    if (!currentAmount || currentAmount < 5) {
      setError('Please select or enter an amount of at least $5');
      return null;
    }
    
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/create-paypal-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ amount: currentAmount }),
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      return result.orderID;
    } catch (err) {
      console.error('PayPal Order error:', err);
      setError(`PayPal error: ${err.message}`);
      throw err;
    }
  };

  const onPayPalApprove = async (data, actions) => {
    try {
      setLoading(true);
      setError(null);

      // Capture server-side to credit balance securely
      const { data: { session: authSession } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/capture-paypal-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({ orderID: data.orderID }),
        }
      );

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      setShowSuccess(true);
      setLoading(false);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('PayPal Capture error:', err);
      setError(`Capture error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleRevolutCheckout = () => {
    // Hidden until Revolut keys are provided by the user
    setLoading(true);
    setTimeout(() => {
      setError('Revolut Business integration is currently pending activation.');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }} onClick={onClose}>
      
      <div className="glass-card card-3d modal-content" style={{
        width: '100%', maxWidth: '600px', padding: '2.5rem',
        position: 'relative', overflow: 'hidden', cursor: 'default'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Background Effects */}
        <div className="glow-orb" style={{ top: '-100px', right: '-100px', width: '300px', height: '300px', opacity: 0.15 }} />
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.25rem' }}>Add Credits</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Secure, zero-fee global payments.</p>
          </div>
          <button onClick={onClose} style={{ 
            background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--text-muted)',
            width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: '0.2s'
          }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={20} />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="error-banner smooth-slide-down" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {showSuccess && (
          <div className="success-banner smooth-slide-down" style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
            <Check size={18} /> Payment successful! Updating your balance...
          </div>
        )}

        {/* Packages Grid */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Select Package
          </p>
          <div className="credit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.amount}
                onClick={() => { setSelectedPackage(pkg.amount); setCustomAmount(''); }}
                className={`credit-pill ${selectedPackage === pkg.amount && !customAmount ? 'active' : ''}`}
                style={{
                  padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)',
                  background: selectedPackage === pkg.amount && !customAmount ? 'var(--primary-soft)' : 'var(--surface)',
                  color: selectedPackage === pkg.amount && !customAmount ? 'var(--primary)' : 'var(--text)',
                  fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer', position: 'relative',
                  transition: 'all 0.2s',
                  borderColor: selectedPackage === pkg.amount && !customAmount ? 'var(--primary)' : 'var(--border-light)'
                }}
              >
                ${pkg.amount}
                {pkg.popular && (
                  <span style={{ position: 'absolute', top: '-8px', right: '50%', transform: 'translateX(50%)', background: 'var(--primary)', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Popular
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
          </div>

          <div style={{ marginTop: '1rem' }}>
             <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
               Custom Amount
             </p>
             <div style={{ position: 'relative' }}>
               <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 800 }}>$</span>
               <input 
                 type="number"
                 placeholder="Enter amount (min $5)"
                 value={customAmount}
                 onChange={(e) => {
                   setCustomAmount(e.target.value);
                   setSelectedPackage(null);
                 }}
                 min="5"
                 style={{
                   width: '100%', padding: '1.2rem 1.2rem 1.2rem 2.5rem',
                   background: 'var(--bg-alt)', border: '1px solid var(--border)',
                   borderRadius: '12px', color: 'var(--text)', fontSize: '1.2rem', fontWeight: 800,
                   outline: 'none', transition: 'border-color 0.2s'
                 }}
                 onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                 onBlur={e => e.target.style.borderColor = 'var(--border)'}
               />
             </div>
          </div>
        </div>

        {/* Payment Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="magic-btn btn-3d" 
            onClick={handleStripeCheckout} 
            disabled={loading}
            style={{ width: '100%', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.1rem' }}
          >
            <CreditCard size={20} />
            {loading ? 'Processing...' : `Pay $${currentAmount || '0'} with Stripe`}
          </button>

          <div style={{ position: 'relative', zIndex: 10, minHeight: '50px' }}>
            {paypalPending ? (
              <div style={{
                height: '45px', borderRadius: '8px', background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: '0.85rem', gap: '0.5rem',
                border: '1px solid var(--border-light)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25"/>
                  <path d="M21 12a9 9 0 01-9 9" strokeLinecap="round"/>
                </svg>
                Loading PayPal...
              </div>
            ) : paypalRejected ? (
              <div style={{
                height: '45px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ef4444', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.2)'
              }}>
                PayPal unavailable — use Stripe instead
              </div>
            ) : (
              <PayPalButtons
                style={{ layout: "horizontal", color: "black", shape: "rect", height: 45 }}
                createOrder={createPayPalOrder}
                onApprove={onPayPalApprove}
                disabled={loading || !currentAmount || currentAmount < 5}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <Lock size={14} /> Payments are secure and encrypted.
        </div>
      </div>
    </div>
  );
}
