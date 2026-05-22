import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Key, CreditCard, BarChart3, Settings, Activity, Plus, Check, ArrowRight } from 'lucide-react';
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
        <div className="dash-header">
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Billing</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Add credits to your account. Pay as you go, no subscriptions.</p>
          </div>
        </div>

        {showSuccess && (
          <div className="success-banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Check size={20} /> Credits requested! In production, balance updates after successful payment.
          </div>
        )}

        {error && (
          <div className="error-banner" style={{ background: 'rgba(255, 95, 86, 0.1)', color: '#ff5f56', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Current Balance</div>
            <div className="value" style={{ color: 'var(--green)' }}>${currentBalance.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Spent (All Time)</div>
            <div className="value">$0.00</div>
          </div>
          <div className="stat-card">
            <div className="label">Last Purchase</div>
            <div className="value">$0.00</div>
          </div>
        </div>

        {/* Credit Packages */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add Credits</h3>
          <div className="credit-packages">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.amount}
                className={`credit-package ${selectedPackage === pkg.amount ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
                onClick={() => {
                  setSelectedPackage(pkg.amount);
                  setCustomAmount('');
                }}
              >
                {pkg.popular && <span className="popular-badge">Most Popular</span>}
                <div className="package-amount">${pkg.amount}</div>
                <div className="package-credits">{pkg.amount} credits</div>
              </div>
            ))}
          </div>

          <div className="custom-amount" style={{ marginTop: '1.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
              Or enter a custom amount
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="input-wrapper" style={{ flex: 1, maxWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    if (e.target.value) setSelectedPackage(null);
                  }}
                  style={{ paddingLeft: '2rem' }}
                  min="5"
                  step="1"
                />
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Minimum $5</span>
            </div>
          </div>
        </div>



        {/* Summary */}
        <div className="card" style={{ background: 'var(--bg-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Selected amount</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', fontSize: '1.2rem' }}>
              ${customAmount || selectedPackage || 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-dim)' }}>Processing fee</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>$0.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 800, fontFamily: 'var(--mono)', fontSize: '1.5rem' }} className="gradient-text">
              ${customAmount || selectedPackage || 0}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              className="btn btn-primary btn-large" 
              style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #333' }} 
              onClick={handleStripeCheckout}
              disabled={loading || (!selectedPackage && !customAmount)}
            >
              <CreditCard size={18} style={{ marginRight: '0.5rem' }} /> 
              {loading ? 'Redirecting...' : 'Pay with Card or Apple Pay'}
            </button>
            
            <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
              <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test", currency: "USD", intent: "capture" }}>
                <PayPalButtons 
                  style={{ layout: "vertical", shape: "rect", color: "gold" }} 
                  createOrder={createPayPalOrder}
                  onApprove={onPayPalApprove}
                  disabled={loading || (!selectedPackage && !customAmount)}
                />
              </PayPalScriptProvider>
            </div>
            
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: '0.5rem' }} 
              onClick={handleCryptoCheckout}
              disabled={loading || (!selectedPackage && !customAmount)}
            >
              Pay with Cryptocurrency
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
            Credits never expire. Secure payment via Stripe.
          </p>
        </div>

        {/* Transaction History */}
        <div className="card" style={{ marginTop: '2rem', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>Transaction History</h3>
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
      </main>
    </div>
  );
}
