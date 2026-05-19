import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Key, CreditCard, BarChart3, Settings, Activity, Plus, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStripe } from '../lib/stripe';
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

        {/* Payment Methods */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Payment Method</h3>
          
          <button className="payment-method-btn" onClick={handleStripeCheckout} disabled={loading}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CreditCard size={24} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>Credit / Debit Card</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visa, Mastercard, Amex, Apple Pay</div>
              </div>
            </div>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : <ArrowRight size={18} />}
          </button>

           <button className="payment-method-btn" onClick={handlePaypalCheckout} disabled={loading} style={{ marginTop: '0.75rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                 <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.605c-.519 0-.96.384-1.04.9l-.89 5.636a.641.641 0 0 1-.633.545l.034-.075Z" fill="#003087"/>
                 <path d="M21.898 6.534c-.993 5.081-4.383 7.277-8.716 7.277h-2.21l-1.1 6.99a.535.535 0 0 1-.528.454H6.052a.319.319 0 0 1-.316-.368l.087-.55 1.54-9.77.067-.347a.535.535 0 0 1 .528-.454h1.673c5.12 0 9.128-2.08 10.267-8.232Z" fill="#002F86"/>
                 <path d="M9.958 6.732a.57.57 0 0 1 .562-.482h5.992c.71 0 1.373.046 1.98.144.17.028.336.06.5.097.163.037.323.08.479.128.078.024.155.05.23.077l.035.012c.28.101.541.222.782.362a5.43 5.43 0 0 0-.983-4.287C18.422.504 16.413 0 13.844 0H6.384c-.524 0-.972.383-1.054.901L2.223 20.597a.762.762 0 0 0 .752.878h5.448l1.369-8.678.166-1.065Z" fill="#009CDE"/>
               </svg>
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontWeight: 600 }}>PayPal</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fast & secure checkout</div>
               </div>
             </div>
             <ArrowRight size={18} />
           </button>

           <button className="payment-method-btn" onClick={handleCryptoCheckout} style={{ marginTop: '0.75rem' }} disabled={loading}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                 <circle cx="12" cy="12" r="10" fill="#F7931A"/>
                 <path d="M15.5 10.5c.3-2-1.2-3-3.3-3.7l.7-2.8-1.7-.4-.7 2.7c-.4-.1-.9-.2-1.3-.3l.7-2.7-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2v-.1l-2.3-.6-.5 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-1.9 7.6c-.1.3-.4.7-1 .5 0 0-1.2-.3-1.2-.3l-.8 2 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.3.3l-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4 1-5.1.7l.9-3.6c1.1.3 4.7.8 4.2 2.9zm.5-5.4c-.5 1.9-3.3.9-4.3.7l.8-3.3c1 .2 4 .7 3.5 2.6z" fill="white"/>
               </svg>
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontWeight: 600 }}>Cryptocurrency</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bitcoin, Ethereum, USDT</div>
               </div>
             </div>
             <ArrowRight size={18} />
           </button>
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
          <button 
            className="btn btn-primary btn-large" 
            style={{ width: '100%' }} 
            onClick={handleStripeCheckout}
            disabled={loading || (!selectedPackage && !customAmount)}
          >
            {loading ? 'Redirecting to Stripe...' : 'Add Credits'} {!loading && <Plus size={18} />}
          </button>
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
