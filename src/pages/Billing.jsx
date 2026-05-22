import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Key, CreditCard, BarChart3, Settings, Activity, Plus, Check, Shield, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStripe } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { safeFetch } from '../lib/safeFetch';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const CREDIT_PACKAGES = [
  { amount: 10, price: 10, popular: false },
  { amount: 25, price: 25, popular: false },
  { amount: 50, price: 50, popular: true },
  { amount: 100, price: 100, popular: false },
  { amount: 250, price: 250, popular: false },
  { amount: 500, price: 500, popular: false },
];

export default function Billing() {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleStripeCheckout = async () => {
    const amount = customAmount || selectedPackage;
    if (!amount || amount < 5) {
      alert('Please select or enter an amount of at least $5');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Call your Supabase Edge Function to create a Checkout Session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const response = await safeFetch(`https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/create-stripe-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ amount, userId: user.id }),
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);

      // 2. Redirect to Stripe Checkout URL
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

   const handlePaypalCheckout = () => {
     setLoading(true);
     setTimeout(() => {
       alert('PayPal Checkout is being integrated. Use Stripe for now.');
       setLoading(false);
     }, 1000);
   };

   const handleCryptoCheckout = () => {
     setLoading(true);
     setTimeout(() => {
       alert('Cryptocurrency payments coming soon.');
       setLoading(false);
     }, 1000);
   };

  const createPayPalOrder = async (data, actions) => {
    const amount = customAmount || selectedPackage;
    if (!amount || amount < 5) {
      alert('Please select or enter an amount of at least $5');
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
        body: JSON.stringify({ amount }),
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      return result.orderID; // Return the order ID to PayPal SDK
    } catch (err) {
      console.error('PayPal Order error:', err);
      setError(`PayPal error: ${err.message}`);
      throw err;
    }
  };

  const onPayPalApprove = async (data, actions) => {
    try {
      setLoading(true);
      // Let PayPal capture the order on the frontend (or do it in webhook)
      // Since our webhook handles 'CHECKOUT.ORDER.APPROVED', we don't strictly need to capture here,
      // but usually the frontend triggers the capture:
      const details = await actions.order.capture();
      setShowSuccess(true);
      setLoading(false);
      // Wait for webhook to update DB, or optimistic update
      setTimeout(() => window.location.reload(), 3000);
    } catch (err) {
      console.error('PayPal Capture error:', err);
      setError(`Capture error: ${err.message}`);
      setLoading(false);
    }
  };

  const currentBalance = user?.balance || 0;

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" className="nav-logo" style={{ fontSize: '1.1rem' }}>
            <span className="dot" />
            <span>digital<strong>and</strong></span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>.ai</span>
          </Link>
        </div>
        <Link to="/dashboard"><Key size={18} /> API Keys</Link>
        <Link to="/dashboard/usage"><BarChart3 size={18} /> Usage</Link>
        <Link to="/dashboard/billing" className="active"><CreditCard size={18} /> Billing</Link>
        <Link to="/dashboard/logs"><Activity size={18} /> Logs</Link>
        <Link to="/dashboard/settings"><Settings size={18} /> Settings</Link>
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current Balance</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--mono)' }} className="gradient-text">${currentBalance.toFixed(2)}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        <div className="dash-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Billing Dashboard</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage your funds, add credits, and view transaction history.</p>
          </div>
        </div>

        {showSuccess && (
          <div className="success-banner smooth-slide-down" style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Check size={20} /> Credits requested! In production, balance updates after successful payment.
          </div>
        )}

        {error && (
          <div className="error-banner smooth-slide-down" style={{ background: 'rgba(255, 95, 86, 0.1)', color: '#ff5f56', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* 2-COLUMN LAYOUT */}
        <div className="billing-container">
          
          {/* LEFT COLUMN: BALANCE & HISTORY */}
          <div className="billing-col-left" style={{ position: 'relative' }}>
            <div className="glow-orb" style={{ top: '-50px', left: '-50px' }}></div>
            
            <div className="balance-glow-card card-3d">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.5rem' }}>
                Available Balance
              </p>
              <h1 style={{ fontSize: '4rem', fontWeight: 900, fontFamily: 'var(--mono)', lineHeight: 1, marginBottom: '1.5rem' }} className="gradient-text">
                ${currentBalance.toFixed(4)}
              </h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', textAlign: 'left' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Spent (All Time)</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>$0.00</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Last Purchase</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>$0.00</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '2rem', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Transaction History</h3>
              </div>
              <table className="key-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No transactions found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Persuasion / Trust Indicators */}
            <div style={{ marginTop: '2.5rem', padding: '2rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} className="text-green" style={{ color: 'var(--green)' }} /> Why choose Digitaland.ai?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text)' }}>No Expiration</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your credits never expire. Use them at your own pace without monthly subscriptions.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text)' }}>Volume Discounts</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scale affordably. Larger credit packages automatically unlock better API rates.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text)' }}>100% Secure</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enterprise-grade 256-bit encryption. We never store your payment details.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text)' }}>Instant Access</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Credits are applied instantly to your account after a successful transaction.</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ADD CREDITS STICKY MODULE */}
          <div className="billing-col-right" style={{ position: 'relative' }}>
            <div className="glow-orb" style={{ bottom: '-50px', right: '-50px', background: 'var(--secondary)' }}></div>
            <div className="add-credits-sticky card-3d">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} className="text-primary" /> Add Credits
              </h3>

              {/* Pill Selector */}
              <div className="pill-grid">
                {CREDIT_PACKAGES.filter(p => p.amount <= 100).map((pkg) => (
                  <div
                    key={pkg.amount}
                    className={`credit-pill ${selectedPackage === pkg.amount ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
                    onClick={() => {
                      setSelectedPackage(pkg.amount);
                      setCustomAmount('');
                    }}
                  >
                    ${pkg.amount}
                  </div>
                ))}
                <div 
                  className={`credit-pill ${!selectedPackage ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedPackage(null);
                    if (!customAmount) setCustomAmount('10');
                  }}
                >
                  Custom
                </div>
              </div>

              {/* Custom Input (Sliding) */}
              {!selectedPackage && (
                <div className="smooth-slide-down" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
                    Custom Amount (Min $5)
                  </label>
                  <div className="input-wrapper">
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                    <input
                      type="number"
                      placeholder="50"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      style={{ paddingLeft: '2rem', width: '100%' }}
                      className="dash-input"
                      min="5"
                      step="1"
                    />
                  </div>
                </div>
              )}

              {/* Checkout Panel */}
              <div className="checkout-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Total to Pay</span>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--mono)', fontSize: '1.5rem' }} className="gradient-text">
                    ${customAmount || selectedPackage || 0}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button 
                    className="btn btn-primary btn-large btn-3d" 
                    style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #333' }} 
                    onClick={handleStripeCheckout}
                    disabled={loading || (!selectedPackage && !customAmount)}
                  >
                    <CreditCard size={18} style={{ marginRight: '0.5rem' }} /> 
                    {loading ? 'Redirecting...' : 'Pay with Card / Apple Pay'}
                  </button>
                  
                  <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
                    <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test", currency: "USD", intent: "capture" }}>
                      <PayPalButtons 
                        style={{ layout: "vertical", shape: "rect", color: "gold", height: 44 }} 
                        createOrder={createPayPalOrder}
                        onApprove={onPayPalApprove}
                        disabled={loading || (!selectedPackage && !customAmount)}
                      />
                    </PayPalScriptProvider>
                  </div>
                  
                  <button 
                    className="btn btn-outline" 
                    style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem' }} 
                    onClick={handleCryptoCheckout}
                    disabled={loading || (!selectedPackage && !customAmount)}
                  >
                    Pay with Cryptocurrency
                  </button>
                </div>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <Lock size={12} />
                  <span>Payments are secure and encrypted. Powered by <strong>Stripe</strong> & <strong>PayPal</strong>.</span>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
