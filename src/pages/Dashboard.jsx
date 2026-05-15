import { useState, useEffect, useMemo } from 'react';
import { Key, Plus, Copy, Trash2, CreditCard, BarChart3, Settings, Activity, ArrowUpRight, TrendingUp, Cpu, Server, Shield, Zap, Globe, RefreshCcw, Bell, X, Check, Lock, DollarSign, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const DEMO_KEYS = [];
const MODEL_USAGE = [];

export default function Dashboard() {
  const { user, updateBalance, addApiKey, removeApiKey } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  // Use the keys from AuthContext instead of local state to keep it fully synced
  const keys = user?.apiKeys || [];
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copied, setCopied] = useState(null);
  const location = useLocation();
  
  // Billing States
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentCanceled, setPaymentCanceled] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Fetch Usage Logs & Transactions
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      setLoadingLogs(true);
      
      // Fetch Logs
      const { data: logsData } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Fetch Transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (logsData) setUsageLogs(logsData);
      if (transData) setTransactions(transData);
      setLoadingLogs(false);
    }
    fetchData();
  }, [user?.id]);

  // Process data for AreaChart (Daily Spend)
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayLogs = usageLogs.filter(l => l.created_at.startsWith(date));
      const totalSpend = dayLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);
      return { date: date.split('-').slice(1).join('/'), spend: totalSpend };
    });
  }, [usageLogs]);

  // Process data for Model Analytics
  const modelStats = useMemo(() => {
    const stats = {};
    usageLogs.forEach(log => {
      stats[log.model] = (stats[log.model] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([model, count]) => ({ model, count, percentage: (count / usageLogs.length) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [usageLogs]);

  // Unified Live Activity Feed
  const liveActivity = useMemo(() => {
    const events = [];

    // Add Transactions
    transactions.forEach(t => {
      events.push({
        id: `t-${t.id}`,
        icon: <DollarSign size={14} />,
        action: 'Payment Successful',
        detail: `$${t.amount.toFixed(2)} added to balance`,
        time: new Date(t.created_at),
        timestamp: new Date(t.created_at).getTime()
      });
    });

    // Add API Logs
    usageLogs.forEach(l => {
      events.push({
        id: `l-${l.id}`,
        icon: <Zap size={14} />,
        action: 'API Request',
        detail: `${l.model} (${l.total_tokens} tokens)`,
        time: new Date(l.created_at),
        timestamp: new Date(l.created_at).getTime()
      });
    });

    // Add API Keys
    (user?.apiKeys || []).forEach(k => {
      events.push({
        id: `k-${k.id}`,
        icon: <Key size={14} />,
        action: 'API Key Created',
        detail: `New key: ${k.name}`,
        time: new Date(Number(k.id)),
        timestamp: Number(k.id)
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [usageLogs, transactions, user?.apiKeys]);

  useEffect(() => {
    // Check if we just returned from a successful stripe checkout
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      setPaymentSuccess(true);
      setShowTopUp(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setShowTopUp(false);
        window.history.replaceState({}, '', '/dashboard');
        window.location.reload(); 
      }, 3000);
    } else if (params.get('canceled') === 'true') {
      setPaymentCanceled(true);
      setShowTopUp(true);
      setTimeout(() => {
        setPaymentCanceled(false);
        window.history.replaceState({}, '', '/dashboard');
      }, 5000);
    }
  }, [location]);

  const handleCopy = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: 'sk-dg-' + Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18),
      created: new Date().toISOString().split('T')[0],
      status: 'active',
      usage: '$0.00',
    };
    
    // Save to Supabase via AuthContext
    await addApiKey(newKey);
    setNewKeyName('');
    setShowCreate(false);
  };

  const handleDelete = async (id) => {
    await removeApiKey(id);
  };

  const handleCheckout = async () => {
    setIsProcessing(true);

    
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-session', {
        body: { amount: topUpAmount, userId: user?.id }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to initialize payment. Please try again later.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        
        <div className="sidebar-group">
          <div className="sidebar-group-title">CONSOLE</div>
          <button className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Activity size={18} /> Overview
          </button>
          <Link to="/playground" className="sidebar-link" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Sparkles size={18} /> AI Playground
          </Link>
          <button className={`sidebar-link ${activeTab === 'keys' ? 'active' : ''}`} onClick={() => setActiveTab('keys')}>
            <Key size={18} /> API Keys
          </button>
          <button className={`sidebar-link ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            <Activity size={18} /> Activity Logs
          </button>
          {user?.isAdmin && (
            <Link to="/admin" className="sidebar-link" style={{ marginTop: '1rem', color: 'var(--primary)', border: '1px solid var(--primary-soft)', background: 'rgba(99, 102, 241, 0.05)' }}>
              <Shield size={18} /> Command Center
            </Link>
          )}
        </div>

        <div className="sidebar-group" style={{ marginTop: '1.5rem' }}>
          <div className="sidebar-group-title">ACCOUNT</div>
          <button className={`sidebar-link ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
            <CreditCard size={18} /> Billing & Usage
          </button>
          <button className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={18} /> Settings
          </button>
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
          <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--mono)', lineHeight: 1 }} className="gradient-text">${user?.balance?.toFixed(2) || '0.00'}</p>
          <button onClick={() => setShowTopUp(true)} className="btn-solid" style={{ width: '100%', marginTop: '1.25rem', padding: '0.6rem', fontSize: '0.85rem', justifyContent: 'center' }}>
            <Plus size={14} /> Add Credits
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        {/* Top Header */}
        <header className="dash-top-header">
          <div className="breadcrumbs">
            <span style={{ color: 'var(--text-muted)' }}>Console</span>
            <span style={{ margin: '0 0.5rem', color: 'var(--border)' }}>/</span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</span>
            <span style={{ marginLeft: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: 'var(--green)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
              <div style={{ width: '6px', height: '6px', background: 'var(--green)', borderRadius: '50%', boxShadow: '0 0 8px var(--green)' }} />
              System Operational
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="icon-btn"><Bell size={18} /></button>
            <Link to="/docs" className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Documentation <ArrowUpRight size={14} style={{ marginLeft: '0.2rem' }} />
            </Link>
          </div>
        </header>

        <div className="dash-content-inner">
          
          {/* ════ OVERVIEW TAB ════ */}
          {activeTab === 'overview' && (
            <div className="fade-in">
              <div className="dash-header">
                <div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: 800 }}>Current Overview</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Real-time analytics and range analysis of your API consumption.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="dash-input" style={{ width: 'auto', padding: '0.5rem' }}>
                    <option>Last 24 Hours</option>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                  <button className="btn-outline" style={{ padding: '0.5rem' }}><RefreshCcw size={16}/></button>
                </div>
              </div>

              {/* Account Data - Primary Stats */}
              <div className="sidebar-group-title" style={{ paddingLeft: 0, marginBottom: '1rem' }}>ACCOUNT DATA</div>
              <div className="stat-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card premium-stat">
                  <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green)' }}><DollarSign size={20} /></div>
                  <div className="label">Current Balance</div>
                  <div className="value">${user?.balance?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="stat-card premium-stat">
                  <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue)' }}><Activity size={20} /></div>
                  <div className="label">Historical Consumption</div>
                  <div className="value">$0.00</div>
                </div>
                <div className="stat-card premium-stat">
                  <div className="stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)' }}><Zap size={20} /></div>
                  <div className="label">Request Count</div>
                  <div className="value">0</div>
                </div>
              </div>

              <div className="overview-grid">
                {/* Range Analysis */}
                <div className="card span-2">
                  <div className="sidebar-group-title" style={{ paddingLeft: 0, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    RANGE ANALYSIS
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>Spend over time</span>
                  </div>
                  <div style={{ width: '100%', height: 250, marginTop: '1.5rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.8rem' }}
                          itemStyle={{ color: 'var(--primary)' }}
                        />
                        <Area type="monotone" dataKey="spend" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-dim)', fontWeight: 700 }}>{usageLogs.length}</span>
                      <span>Total Requests</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', color: 'var(--text-dim)', fontWeight: 700 }}>
                        ${usageLogs.reduce((acc, l) => acc + (l.cost || 0), 0).toFixed(4)}
                      </span>
                      <span>Total Spend (Last 100)</span>
                    </div>
                  </div>
                </div>

                {/* Performance & Quota */}
                <div className="card">
                  <div className="sidebar-group-title" style={{ paddingLeft: 0, marginBottom: '1.5rem' }}>RESOURCE CONSUMPTION</div>
                  <div className="info-list">
                    <div className="info-item">
                      <span className="info-label">Quota in Range</span>
                      <span className="info-val" style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>$0.00</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Tokens in Range</span>
                      <span className="info-val" style={{ fontFamily: 'var(--mono)' }}>0</span>
                    </div>
                  </div>

                  <div className="sidebar-group-title" style={{ paddingLeft: 0, marginTop: '2rem', marginBottom: '1.5rem' }}>PERFORMANCE METRICS</div>
                  <div className="info-list">
                    <div className="info-item">
                      <span className="info-label">Average RPM</span>
                      <span className="info-val">0.000</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Average TPM</span>
                      <span className="info-val">0.000</span>
                    </div>
                  </div>
                </div>

                {/* Independent Information */}
                <div className="card">
                  <div className="sidebar-group-title" style={{ paddingLeft: 0, marginBottom: '1.5rem' }}>INDEPENDENT INFORMATION</div>
                  <div className="info-list">
                    <div className="info-item">
                      <span className="info-label">Current Plan</span>
                      <span className="info-val" style={{ color: 'var(--primary)', fontWeight: 600 }}>Pay-as-you-go</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Active Models</span>
                      <span className="info-val">0</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Failed Requests</span>
                      <span className="info-val" style={{ color: 'var(--text-muted)' }}>0.00%</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Server Location</span>
                      <span className="info-val" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Globe size={12}/> Global Edge</span>
                    </div>
                  </div>
                </div>

                {/* Model Analytics */}
                <div className="card span-2">
                  <div className="sidebar-group-title" style={{ paddingLeft: 0, marginBottom: '1.5rem' }}>MODEL ANALYTICS</div>
                  <div className="model-usage-list">
                    {modelStats.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <BarChart3 size={32} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.85rem' }}>No API requests made yet.</p>
                      </div>
                    ) : modelStats.map((m, i) => (
                      <div className="model-usage-item" key={i}>
                        <div className="usage-info">
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.model}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.count} requests</span>
                        </div>
                        <div className="usage-bar-bg">
                          <div className="usage-bar-fill" style={{ width: `${m.percentage}%`, background: `hsl(${220 + i * 30}, 70%, 60%)` }}></div>
                        </div>
                        <div className="usage-cost">{m.percentage.toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                  <div className="sidebar-group-title" style={{ paddingLeft: 0, marginBottom: '1.5rem' }}>RECENT ACTIVITY</div>
                  <div className="activity-feed">
                    {liveActivity.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>
                        <Activity size={32} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.85rem' }}>No recent activity.</p>
                      </div>
                    ) : liveActivity.map(activity => (
                      <div className="activity-item" key={activity.id}>
                        <div className="activity-icon" style={{ color: 'var(--primary)' }}>{activity.icon}</div>
                        <div className="activity-content">
                          <div className="activity-action" style={{ fontWeight: 700 }}>{activity.action}</div>
                          <div className="activity-detail">{activity.detail}</div>
                          <div className="activity-time">{activity.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ API KEYS TAB ════ */}
          {activeTab === 'keys' && (
            <div className="fade-in">
              <div className="dash-header">
                <div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: 800 }}>API Keys</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage your secret keys for API access. Do not share them.</p>
                </div>
                <button className="btn-solid" onClick={() => setShowCreate(!showCreate)}>
                  <Plus size={18} /> Create New Key
                </button>
              </div>

              {/* Create Key Panel */}
              {showCreate && (
                <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', animation: 'slideDown 0.3s ease' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Key Name</label>
                    <input
                      type="text"
                      placeholder="e.g. My Production App"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                      className="dash-input"
                    />
                  </div>
                  <button className="btn-solid" onClick={handleCreate} style={{ whiteSpace: 'nowrap' }}>
                    Generate Key
                  </button>
                  <button className="btn-outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                </div>
              )}

              {/* Keys Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="key-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>SECRET KEY</th>
                      <th>CREATED</th>
                      <th>USAGE</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map(k => (
                      <tr key={k.id}>
                        <td style={{ color: 'var(--text)', fontWeight: 600 }}>{k.name}</td>
                        <td>
                          <div className="blur-key">
                            <span>{k.key.substring(0, 12)}••••••••••••</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{k.created}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{k.usage}</td>
                        <td><span className="key-status active">Active</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleCopy(k.key, k.id)}
                              className={`action-btn ${copied === k.id ? 'success' : ''}`}
                              title="Copy"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(k.id)}
                              className="action-btn danger"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {keys.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                          <Key size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                          <p>No API keys yet. Click "Create New Key" to get started.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quick Start */}
              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <Zap size={18} className="text-primary"/> Quick Start Integration
                </h3>
                <div className="code-window" style={{ border: '1px solid var(--border-light)' }}>
                  <div className="code-toolbar">
                    <span className="code-dot r" /><span className="code-dot y" /><span className="code-dot g" />
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>bash</span>
                  </div>
                  <div className="code-body">
                    <div><span className="cc"># Install the OpenAI SDK</span></div>
                    <div><span className="cv">$</span> npm install openai</div>
                    <br />
                    <div><span className="cc"># Set your environment variables</span></div>
                    <div><span className="cv">$</span> export OPENAI_BASE_URL=<span className="cs">https://api.digitaland.ai/v1</span></div>
                    <div><span className="cv">$</span> export DIGITALAND_API_KEY=<span className="cs">sk-dg-your-key-here</span></div>
                    <br />
                    <div><span className="cc"># Note: Use 'X-API-Key' header for custom integrations</span></div>
                    <div><span className="cv">$</span> curl -H <span className="cs">"X-API-Key: $DIGITALAND_API_KEY"</span> $OPENAI_BASE_URL/chat/completions ...</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ LOGS TAB ════ */}
          {activeTab === 'logs' && (
            <div className="fade-in">
              <div className="dash-header">
                <div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: 800 }}>Activity Logs</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Detailed history of API requests, security events, and account changes.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-outline" onClick={() => window.location.reload()}><RefreshCcw size={16} /> Refresh</button>
                  <button className="btn-outline">Export CSV</button>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="key-table">
                  <thead>
                    <tr>
                      <th>EVENT</th>
                      <th>DETAILS</th>
                      <th>TYPE</th>
                      <th>COST / TOKENS</th>
                      <th style={{ textAlign: 'right' }}>TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Zap size={14} />
                            </div>
                            <span style={{ fontWeight: 600 }}>API Request</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-dim)' }}>{log.model}</td>
                        <td>
                          <span className="s-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            API_REQ
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--green)' }}>-${(log.cost || 0).toFixed(4)} <small style={{ color: 'var(--text-muted)' }}>/ {log.total_tokens} tokens</small></span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {usageLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                          <Activity size={32} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                          <p>No transactions found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ BILLING TAB ════ */}
          {activeTab === 'billing' && (
            <div className="fade-in">
              <div className="dash-header">
                <div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: 800 }}>Billing & Usage</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage your account balance, payment methods, and billing history.</p>
                </div>
              </div>

              <div className="overview-grid" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, transparent 100%)', borderColor: 'var(--primary-soft)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Available Balance</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--text)' }}>${user?.balance?.toFixed(2) || '0.00'}</div>
                  </div>
                  <button className="btn-solid" onClick={() => setShowTopUp(true)} style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
                    <Plus size={16} /> Add Credits
                  </button>
                </div>

                <div className="card span-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Payment Methods</h3>
                    <button className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Add Method</button>
                  </div>
                  <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CreditCard size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>No payment methods added</p>
                    <p style={{ fontSize: '0.85rem' }}>Add a credit card or link PayPal to easily top up your balance.</p>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Billing History</h3>
                </div>
                <table className="key-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>DESCRIPTION</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                      <th>RECEIPT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{t.description}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>+${t.amount.toFixed(2)}</td>
                        <td>
                          <span className="s-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--green)' }}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button className="action-btn" title="Download Receipt"><Copy size={14} /></button>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                          <Activity size={32} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                          <p>No transactions found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ SETTINGS TAB ════ */}
          {activeTab === 'settings' && (
            <div className="fade-in">
              <div className="dash-header">
                <div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', fontWeight: 800 }}>Account Settings</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage your profile, security preferences, and notifications.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Profile Settings */}
                <div className="card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', fontWeight: 700 }}>Profile Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name</label>
                      <input type="text" className="dash-input" defaultValue={user?.name || ''} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
                      <input type="email" className="dash-input" defaultValue={user?.email || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                    </div>
                  </div>
                  <button className="btn-solid" style={{ marginTop: '1.5rem' }}>Save Profile</button>
                </div>

                {/* Security Settings */}
                <div className="card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', fontWeight: 700 }}>Security & Authentication</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 600 }}>Password</h4>
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>It's a good idea to use a strong password that you're not using elsewhere.</p>
                    </div>
                    <button className="btn-outline">Change Password</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 600 }}>Two-Factor Authentication (2FA)</h4>
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Add an extra layer of security to your account using an authenticator app.</p>
                    </div>
                    <button className="btn-solid">Enable 2FA</button>
                  </div>
                </div>

                {/* Referral Program */}
                <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-soft) 0%, transparent 100%)', border: '1px solid var(--primary-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 800 }} className="gradient-text">Refer & Earn Credits</h3>
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Invite your friends to Digitaland.ai and get $1.00 for every friend who tops up their account.</p>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TOTAL EARNED</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>$0.00</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, background: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      https://digitaland.ai/signup?ref={user?.referral_code || 'dg123'}
                    </div>
                    <button className="btn-solid" onClick={() => handleCopy(`https://digitaland.ai/signup?ref=${user?.referral_code || 'dg123'}`, 'ref')}>
                      <Copy size={16} /> {copied === 'ref' ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                <div className="card">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', fontWeight: 700 }}>Notification Preferences</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <div>
                        <span style={{ display: 'block', fontWeight: 600 }}>Usage Alerts</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Email me when I exceed 80% of my spending limit.</span>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <div>
                        <span style={{ display: 'block', fontWeight: 600 }}>Product Updates</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Receive emails about new models, features, and platform updates.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--red)', marginBottom: '1rem', fontWeight: 700 }}>Danger Zone</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Once you delete your account, there is no going back. All your keys, balance, and usage data will be permanently destroyed.</p>
                  <button className="btn-solid" style={{ background: 'var(--red)', color: '#fff', border: 'none' }}>Delete Account</button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* ════ TOP UP MODAL ════ */}
      {showTopUp && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content fade-in-up" style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', overflow: 'hidden' }}>
            
            {paymentSuccess ? (
              <div className="fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(16,185,129,0.1)', color: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Check size={40} strokeWidth={3} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text)' }}>Payment Successful!</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>${topUpAmount}.00 has been added to your balance.</p>
              </div>
            ) : paymentCanceled ? (
              <div className="fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <X size={40} strokeWidth={3} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text)' }}>Payment Canceled</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>No charges were made. You can try again whenever you want.</p>
                <button onClick={() => setPaymentCanceled(false)} className="btn-outline" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>Dismiss</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowTopUp(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
                
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Add Credits</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '2rem' }}>Credits never expire and are used for API requests.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  {[10, 25, 50, 100].map(amount => (
                    <div 
                      key={amount}
                      onClick={() => setTopUpAmount(amount)}
                      style={{ 
                        border: `2px solid ${topUpAmount === amount ? 'var(--primary)' : 'var(--border-light)'}`,
                        borderRadius: '12px', padding: '1rem', textAlign: 'center', cursor: 'pointer',
                        background: topUpAmount === amount ? 'var(--primary-soft)' : 'var(--surface)',
                        transition: '0.2s'
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--mono)' }}>${amount}</div>
                      {amount === 25 && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.25rem' }}>MOST POPULAR</div>}
                      {amount === 100 && <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700, marginTop: '0.25rem' }}>BEST VALUE</div>}
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Total to pay</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>${topUpAmount}.00</span>
                </div>

                <button onClick={handleCheckout} disabled={isProcessing} className="btn-solid" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}>
                  {isProcessing ? 'Processing...' : `Pay with Stripe`}
                </button>
                
                <div style={{ textAlign: 'center', margin: '1rem auto 0', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Lock size={12} /> Secure encrypted payment
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
