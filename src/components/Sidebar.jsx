import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Sparkles, Key, Shield, CreditCard, Plus, BookOpen, Layers, MessageSquare, BarChart2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';

export default function Sidebar() {
  const { user, isProfileLoading } = useAuth();
  const { openPaymentModal } = usePayment();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const path = location.pathname;
  const tab = searchParams.get('tab');

  const isPlayground = path.startsWith('/playground');
  const isKeys = path.startsWith('/dashboard') && tab === 'keys';
  const isLogs = path.startsWith('/dashboard') && tab === 'logs';
  const isUsage = path.startsWith('/dashboard') && tab === 'usage';
  const isSettings = path.startsWith('/dashboard') && tab === 'settings';
  const isBilling = path.startsWith('/dashboard') && tab === 'billing';
  const isDocs = path.startsWith('/docs');
  const isModels = path.startsWith('/models');

  return (
    <aside className="dash-sidebar">
      <div className="sidebar-group">
        <div className="sidebar-group-title">PLATFORM</div>

        <Link to="/playground" className={`sidebar-link ${isPlayground ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <Sparkles size={18} /> Playground
        </Link>

        <Link to="/dashboard?tab=billing" className={`sidebar-link ${isBilling ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <CreditCard size={18} /> Billing
        </Link>

        <Link to="/dashboard?tab=keys" className={`sidebar-link ${isKeys ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <Key size={18} /> API Keys
        </Link>

        <Link to="/dashboard?tab=usage" className={`sidebar-link ${isUsage ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <BarChart2 size={18} /> Usage
        </Link>

        <Link to="/dashboard?tab=logs" className={`sidebar-link ${isLogs ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <Activity size={18} /> Logs
        </Link>

        {user?.isAdmin && (
          <Link to="/admin" className="sidebar-link" style={{ textDecoration: 'none', color: 'var(--secondary)', fontWeight: 800 }}>
            <Shield size={18} /> Command Center
          </Link>
        )}
      </div>

      <div className="sidebar-group" style={{ marginTop: '1.5rem' }}>
        <div className="sidebar-group-title">QUICK LINKS</div>
        <Link to="/models" className={`sidebar-link ${isModels ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <Layers size={18} /> Models Gallery
        </Link>
        <Link to="/docs" className={`sidebar-link ${isDocs ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
          <BookOpen size={18} /> Documentation
        </Link>
        <a href="https://discord.gg/digitaland" target="_blank" rel="noreferrer" className="sidebar-link" style={{ textDecoration: 'none' }}>
          <MessageSquare size={18} /> Join Discord
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
