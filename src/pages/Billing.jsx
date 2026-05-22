import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Key, CreditCard, BarChart3, Settings, Activity, Plus, Check, Shield, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';

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
  const { openPaymentModal } = usePayment();
  
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

        {/* Error/Success handling now in PaymentModal */}

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
          <div className="billing-col-right">
            <div className="card-3d glass-card" style={{ padding: '2rem', borderRadius: '24px', position: 'sticky', top: '2rem', zIndex: 10 }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.25rem' }}>Fund your API</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Pay as you go. No hidden fees.</p>
              </div>
              
              <button onClick={() => openPaymentModal()} className="magic-btn btn-3d" style={{ width: '100%', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
                <Plus size={20} className="text-primary" /> Add Credits
              </button>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
