import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Sparkles, Key, Shield, CreditCard, Settings, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';

export default function Sidebar() {
  const { user, isProfileLoading } = useAuth();
  const { openPaymentModal } = usePayment();
  const location = useLocation();
  const navigate = useNavigate();
  
  const path = location.pathname;
  const isDashboard = path === '/dashboard';
  const isPlayground = path.startsWith('/playground');
  const isKeys = path.includes('/dashboard/keys');
  const isLogs = path.includes('/dashboard/logs');
  const isSettings = path.includes('/dashboard/settings');
  const isBilling = path.includes('/billing');

  const handleTabChange = (tab) => {
    if (tab === 'overview') navigate('/dashboard');
    else navigate(`/dashboard/${tab}`);
  };

  return (
    <aside className="dash-sidebar">
      <div className="sidebar-group">
        <div className="sidebar-group-title">PLATFORM</div>
        <Link to="/playground" className={`sidebar-link ${isPlayground ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <Sparkles size={18} /> Playground
        </Link>
        <button className={`sidebar-link ${isBilling ? 'active' : ''}`} onClick={() => navigate('/dashboard/billing')}>
          <CreditCard size={18} /> Billing
        </button>
        <button className={`sidebar-link ${isKeys ? 'active' : ''}`} onClick={() => handleTabChange('keys')}>
          <Key size={18} /> API Keys
        </button>
        <button className={`sidebar-link ${isLogs ? 'active' : ''}`} onClick={() => handleTabChange('logs')}>
          <Activity size={18} /> Usage & Logs
        </button>
        {user?.isAdmin && (
          <Link to="/admin" className="sidebar-link" style={{ textDecoration: 'none', color: 'var(--secondary)', fontWeight: 800 }}>
            <Shield size={18} /> Command Center
          </Link>
        )}
      </div>

      <div className="sidebar-group" style={{ marginTop: '1.5rem' }}>
        <div className="sidebar-group-title">QUICK LINKS</div>
        <Link to="/docs" className="sidebar-link" style={{ textDecoration: 'none' }}>
          <Settings size={18} /> Documentation
        </Link>
        <Link to="/models" className="sidebar-link" style={{ textDecoration: 'none' }}>
          <Activity size={18} /> Models Gallery
        </Link>
        <a href="https://discord.gg/digitaland" target="_blank" rel="noreferrer" className="sidebar-link" style={{ textDecoration: 'none' }}>
          <Shield size={18} /> Join Discord
        </a>
      </div>

      <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Balance</p>
          <span style={{ 
            background: (user?.balance > 100 ? 'var(--purple-soft)' : (user?.balance > 50 ? 'var(--blue-soft)' : 'var(--green-soft)')), 
            color: (user?.balance > 100 ? 'var(--purple)' : (user?.balance > 50 ? 'var(--blue)' : 'var(--green)')), 
            padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 
          }}>
            {user?.balance > 100 ? 'GOLD TIER' : (user?.balance > 50 ? 'SILVER TIER' : 'BRONZE TIER')}
          </span>
        </div>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--mono)', lineHeight: 1 }} className="gradient-text">
          {isProfileLoading ? (
            <span className="balance-skeleton pulse" style={{ display: 'inline-block', width: '100px', height: '28px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
          ) : (
            `$${user?.balance?.toFixed(5) || '0.00000'}`
          )}
        </p>
        <button onClick={() => openPaymentModal()} className="btn-solid" style={{ width: '100%', marginTop: '1.25rem', padding: '0.6rem', fontSize: '0.85rem', justifyContent: 'center' }}>
          <Plus size={14} /> Add Credits
        </button>
      </div>
    </aside>
  );
}
