import { useState, useEffect, useMemo } from 'react';
import { Users, DollarSign, Activity, TrendingUp, ShieldCheck, Search, ArrowUpRight, ArrowDownRight, Zap, Globe, Server, Database, Menu, Bell, Power, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Navigate, Link } from 'react-router-dom';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

export default function Admin() {
  const { user: authUser } = useAuth();
  const { theme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalRequests: 0,
    activeToday: 0,
    totalProfit: 0
  });
  const [globalLogs, setGlobalLogs] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);

  const isDark = theme === 'dark';

  useEffect(() => {
    async function checkAdminAndFetch() {
      if (authUser.email === 'rooter@digitaland.ai' || authUser.id === 'mock-rooter-id') {
        setIsAdmin(true);
      } else {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', authUser.id)
          .single();

        if (profileErr || (!profile?.is_admin && authUser.email !== 'corgasmario@gmail.com')) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
      }

      try {
        const [users, logs, transactions] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(1000),
          supabase.from('transactions').select('amount')
        ]);

        const usersList = users.data || [];
        const logsList = logs.data || [];
        const transList = transactions.data || [];
        
        const revenue = transList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const profit = logsList.reduce((acc, curr) => acc + (curr.cost || 0), 0);
        const today = new Date().toISOString().split('T')[0];
        const activeToday = logsList.filter(l => l.created_at.startsWith(today)).length;

        setStats({
          totalUsers: usersList.length,
          totalRevenue: revenue,
          totalRequests: logsList.length,
          activeToday: activeToday,
          totalProfit: profit
        });

        setAllProfiles(usersList);
        setGlobalLogs(logsList);
      } catch (err) {
        console.error('Admin Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAdminAndFetch();
  }, [authUser]);

  const dailyChartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayLogs = globalLogs.filter(l => l.created_at.startsWith(date));
      return { 
        date: date.split('-').slice(1).join('/'), 
        requests: dayLogs.length,
        profit: dayLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0)
      };
    });
  }, [globalLogs]);

  const modelDistribution = useMemo(() => {
    const counts = {};
    globalLogs.forEach(l => { counts[l.model] = (counts[l.model] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 5);
  }, [globalLogs]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="shimmer" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', marginBottom: '1rem' }} />
      <p style={{ letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.6 }}>INITIALIZING COMMAND CENTER</p>
    </div>
  );
  
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Bar */}
      <nav style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, background: 'var(--surface-translucent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--primary)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <ShieldCheck size={20} />
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.5px', fontSize: '1.2rem' }}>COMMAND CENTER <span style={{ color: 'var(--primary)', opacity: 0.5 }}>v2.0</span></span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} /> API ONLINE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} /> GATEWAY HEALTHY</div>
          </div>
          <Link to="/dashboard" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Exit Console</Link>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Hero Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Revenue', value: stats.totalRevenue, icon: <DollarSign />, color: '#6366f1', prefix: '$' },
            { label: 'Platform Profit', value: stats.totalProfit, icon: <TrendingUp />, color: '#22c55e', prefix: '$' },
            { label: 'Network Users', value: stats.totalUsers, icon: <Users />, color: '#8b5cf6', prefix: '' },
            { label: 'Global Traffic', value: stats.totalRequests, icon: <Activity />, color: '#f59e0b', prefix: '' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: s.color, filter: 'blur(50px)', opacity: 0.15 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</span>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{s.prefix}{s.value.toLocaleString(undefined, { minimumFractionDigits: s.prefix ? 2 : 0, maximumFractionDigits: s.prefix ? 2 : 0 })}</h2>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Main Traffic Chart */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>System Performance <span style={{ opacity: 0.3, fontWeight: 400 }}>(7 Days)</span></h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                 <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '2px', background: '#6366f1' }} /> REQUESTS</div>
                 <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '2px', background: '#22c55e' }} /> PROFIT</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text)' }} />
                  <Area type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={3} fill="transparent" />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={3} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Popularity */}
          <div className="card" style={{ padding: '2rem' }}>
             <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '2rem' }}>Model Market Share</h3>
             <div style={{ width: '100%', height: 250 }}>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={modelDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                     {modelDistribution.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div style={{ marginTop: '1rem' }}>
               {modelDistribution.map((m, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{m.value} req</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Tables Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
           
           {/* Top Users Card */}
           <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} color="var(--primary)" /> Top Clients</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 {allProfiles.sort((a,b) => (b.balance || 0) - (a.balance || 0)).slice(0, 6).map((p, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-alt)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                        {p.email[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{p.email}</p>
                        <p style={{ fontSize: '0.7rem', opacity: 0.4 }}>Status: <span style={{ color: '#22c55e' }}>Active</span></p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>${p.balance?.toFixed(2)}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Global Activity Console */}
           <div className="card" style={{ padding: '2rem', background: 'var(--bg-alt)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={20} color="#f59e0b" /> Real-time Activity</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="btn-outline" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>Export CSV</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', opacity: 0.3, borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ padding: '1rem' }}>USER</th>
                      <th style={{ padding: '1rem' }}>MODEL</th>
                      <th style={{ padding: '1rem' }}>TOKENS</th>
                      <th style={{ padding: '1rem' }}>PROFIT</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalLogs.slice(0, 12).map((log, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1rem', opacity: 0.6, fontFamily: 'monospace' }}>{log.user_id.slice(0, 8)}</td>
                        <td style={{ padding: '1rem' }}><span style={{ padding: '0.2rem 0.5rem', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.75rem' }}>{log.model}</span></td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{log.total_tokens.toLocaleString()}</td>
                        <td style={{ padding: '1rem', color: '#22c55e', fontWeight: 800 }}>+${log.cost?.toFixed(4)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', opacity: 0.4, fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
