import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, Zap, Settings2, Trash2, Cpu, Sparkles, AlertCircle, Settings, ArrowUpRight, Copy, RefreshCcw, StopCircle, Terminal, Info, Search, Filter, Sliders, MessageSquare, Image as ImageIcon, Film, Music, Type as TypeIcon, User, RefreshCw, Command } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MODELS, PROVIDERS } from '../data/models';

export default function Playground() {
  const { user, refreshUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1);
  const [showSettings, setShowSettings] = useState(true);
  const [activeTab, setActiveTab] = useState('models'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); 
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const abortControllerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    if (!user) {
      setError('Please sign in to use the Playground.');
      return;
    }

    if (user.balance <= 0) {
      setError('Insufficient balance. Please add credits in the Dashboard.');
      return;
    }

    const userMessage = { role: 'user', content: input, modelId: selectedModel };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiKey = user.apiKeys?.[0]?.key;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const response = await fetch('https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-api-key': apiKey || '',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...newMessages.map(m => ({ role: m.role, content: m.content }))] : newMessages.map(m => ({ role: m.role, content: m.content })),
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stream: true
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || `Gateway Error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.includes('[DONE]')) break;
          if (!line.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(line.replace('data: ', ''));
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              assistantContent += content;
              setStreamingMessage(assistantContent);
            }
          } catch (e) {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent, modelId: selectedModel }]);
      setStreamingMessage('');
      if (refreshUser) refreshUser();
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Playground Error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Auto-select logic
  useEffect(() => {
    if (filterType === 'All') return;
    const categoryModels = MODELS.filter(m => m.type === filterType);
    const currentModelObj = MODELS.find(m => m.id === selectedModel);
    if (categoryModels.length > 0 && currentModelObj?.type !== filterType) {
      setSelectedModel(categoryModels[0].id);
    }
  }, [filterType, selectedModel]);

  const [lastSync, setLastSync] = useState(new Date());
  useEffect(() => {
    setLastSync(new Date());
  }, [user?.balance]);

  return (
    <div className="playground-root" style={{ 
      display: 'flex',
      height: 'calc(100vh - 68px)', 
      background: '#020202',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)'
    }}>
      
      {/* 1. ASYMMETRIC SLIDE BAR (Far Left) */}
      <div style={{ 
        width: '84px', 
        background: 'rgba(5, 5, 8, 0.95)', 
        borderRight: '1px solid rgba(255,255,255,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.75rem 0',
        gap: '1.25rem',
        zIndex: 100,
        boxShadow: '10px 0 30px rgba(0,0,0,0.5)'
      }}>
        {[
          { id: 'All', icon: Filter, label: 'All', color: '#818cf8' },
          { id: 'Chat', icon: MessageSquare, label: 'Chat', color: '#10b981' },
          { id: 'Image', icon: ImageIcon, label: 'Image', color: '#ec4899' },
          { id: 'Video', icon: Film, label: 'Video', color: '#f59e0b' },
          { id: 'Audio', icon: Music, label: 'Audio', color: '#06b6d4' },
          { id: 'Reasoning', icon: Zap, label: 'Think', color: '#8b5cf6' }
        ].map(cat => {
          const isActive = filterType === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setFilterType(cat.id);
                setActiveTab('models');
                setSearchQuery('');
              }}
              style={{
                width: '58px', height: '58px', borderRadius: '20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                background: isActive ? `rgba(${cat.color === '#818cf8' ? '129, 140, 248' : '255, 255, 255'}, 0.08)` : 'transparent',
                borderColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: isActive ? cat.color : 'rgba(255,255,255,0.2)',
                boxShadow: isActive ? `0 0 30px ${cat.color}20` : 'none',
                position: 'relative'
              }}
              title={cat.label}
            >
              <cat.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: isActive ? 1 : 0.4 }}>{cat.label}</span>
              {isActive && (
                <div style={{ 
                  position: 'absolute', right: '-1px', top: '20%', bottom: '20%', width: '4px', 
                  background: cat.color, borderRadius: '4px 0 0 4px',
                  boxShadow: `0 0 15px ${cat.color}`
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. CONTEXT & ENGINE SIDEBAR */}
      {showSettings && (
        <aside style={{ 
          width: '360px', 
          background: 'rgba(8, 8, 12, 0.4)', 
          backdropFilter: 'blur(50px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          overflow: 'hidden',
          zIndex: 90
        }}>
          {/* Sidebar Header */}
          <div style={{ padding: '1.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 900, fontSize: '1.3rem', color: '#fff', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              <Cpu size={22} color="var(--primary)" /> {filterType === 'All' ? 'Neural Matrix' : `${filterType} Core`}
            </h3>
            
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '0.3rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { id: 'models', icon: Filter, label: 'Engines' },
                { id: 'system', icon: MessageSquare, label: 'Context' },
                { id: 'params', icon: Sliders, label: 'Matrix' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    padding: '0.7rem', borderRadius: '11px', fontSize: '0.75rem', fontWeight: 700,
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
                    transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', scrollbarWidth: 'none' }}>
            {activeTab === 'models' && (
              <>
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.2 }} />
                  <input 
                    type="text" 
                    placeholder={searchQuery ? 'Searching globally...' : `Search in ${filterType.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px', padding: '0.85rem 1.25rem 0.85rem 3rem', color: '#fff', fontSize: '0.9rem',
                      outline: 'none', transition: '0.3s',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>

                {Object.keys(PROVIDERS).map(provider => {
                  const providerModels = MODELS.filter(m => {
                    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                          m.provider.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesType = searchQuery ? true : (filterType === 'All' || m.type === filterType);
                    return m.provider === provider && matchesSearch && matchesType;
                  });
                  if (providerModels.length === 0) return null;

                  return (
                    <div key={provider} style={{ marginBottom: '1.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem', padding: '0 0.5rem' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: PROVIDERS[provider].color, boxShadow: `0 0 10px ${PROVIDERS[provider].color}` }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{provider}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {providerModels.map(model => {
                          const isSelected = selectedModel === model.id;
                          const ModelIcon = model.type === 'Image' ? ImageIcon : model.type === 'Video' ? Film : model.type === 'Audio' ? Music : TypeIcon;
                          
                          return (
                            <button 
                              key={model.id}
                              onClick={() => setSelectedModel(model.id)}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem',
                                borderRadius: '16px', border: '1px solid transparent',
                                textAlign: 'left', cursor: 'pointer',
                                background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                borderColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                                transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                width: '100%'
                              }}
                            >
                              <div style={{ 
                                width: '36px', height: '36px', borderRadius: '10px', 
                                background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isSelected ? '#fff' : 'rgba(255,255,255,0.25)',
                                transition: '0.3s'
                              }}>
                                <ModelIcon size={18} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{model.name}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>{model.type}</span>
                                </div>
                              </div>
                              {isSelected && <Zap size={16} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 5px var(--primary))' }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'system' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', display: 'block' }}>System Protocol</label>
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Initialize core behavior parameters..."
                    style={{ 
                      width: '100%', height: '260px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px', padding: '1.25rem', color: '#fff', fontSize: '0.95rem', outline: 'none', resize: 'none',
                      lineHeight: 1.7, transition: '0.3s'
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'params' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {[
                  { label: 'Temperature', val: temperature, set: setTemperature, min: 0, max: 2, step: 0.1, desc: 'Randomness control' },
                  { label: 'Max Tokens', val: maxTokens, set: setMaxTokens, min: 256, max: 32000, step: 256, desc: 'Output length' },
                  { label: 'Top P', val: topP, set: setTopP, min: 0, max: 1, step: 0.05, desc: 'Nucleus sampling' }
                ].map(p => (
                  <div key={p.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{p.label}</label>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>{p.desc}</span>
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--mono)' }}>{p.val}</span>
                    </div>
                    <input 
                      type="range" min={p.min} max={p.max} step={p.step} value={p.val} 
                      onChange={(e) => p.set(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary)', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', appearance: 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Footer (Prominent Balance Card) */}
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5, 5, 8, 0.4)' }}>
            <div style={{ 
              padding: '1.5rem', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(0,0,0,0) 100%)', 
              border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'var(--primary)', filter: 'blur(50px)', opacity: 0.1 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Balance</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div className="neural-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981' }}>LIVE</span>
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--mono)', letterSpacing: '-0.05em' }}>
                ${user?.balance?.toFixed(5) || '0.00000'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <Link to="/dashboard" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Manage Funds <ArrowUpRight size={10} />
                </Link>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>Updated {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 3. ASYMMETRIC CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#030303', position: 'relative' }}>
        
        {/* Chat Header */}
        <div style={{ 
          padding: '1rem 3rem', 
          background: 'rgba(2, 2, 2, 0.8)', 
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 80
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              style={{ 
                color: showSettings ? 'var(--primary)' : 'rgba(255,255,255,0.2)', 
                transition: '0.3s',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase'
              }}
            >
              <Settings size={20} />
              <span>{showSettings ? 'Hide Config' : 'Show Config'}</span>
            </button>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="neural-pulse" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 15px #10b981' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Neural Link: <span style={{ color: '#fff' }}>Secure & Synced</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
                {MODELS.find(m => m.id === selectedModel)?.name}
              </div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                Active Processor
              </div>
            </div>
            <button 
              onClick={() => setMessages([])} 
              style={{ 
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.3)', transition: '0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }} 
              title="Wipe Session"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Messages Viewport */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4rem 6rem', display: 'flex', flexDirection: 'column', gap: '3.5rem', scrollbarWidth: 'none' }}>
          
          {error && (
            <div style={{ 
              padding: '1.75rem 2.25rem', borderRadius: '28px', background: 'rgba(239, 68, 68, 0.03)', 
              color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', 
              display: 'flex', alignItems: 'center', gap: '1.5rem',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={28} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Link Protocol Failed</span>
                <span style={{ fontSize: '0.95rem', opacity: 0.7, lineHeight: 1.5 }}>{error}</span>
              </div>
            </div>
          )}

          {messages.length === 0 && !error && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '580px', opacity: 0.9 }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '28px', margin: '0 auto 3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', borderRadius: '28px', filter: 'blur(30px)', opacity: 0.1 }} />
                <Sparkles size={40} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '1.25rem', color: '#fff', letterSpacing: '-0.04em' }}>Neural Studio Playground</h2>
              <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
                Experience the next generation of multi-modal intelligence. Deploy complex prompts across Chat, Image, Video, and Reasoning labs with zero latency.
              </p>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const modelObj = MODELS.find(mod => mod.id === m.modelId);
            
            return (
              <div key={i} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                paddingLeft: isUser ? '10%' : '0',
                paddingRight: isUser ? '0' : '10%',
                animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  marginBottom: '0.75rem',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  opacity: 0.5
                }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '10px', 
                    background: isUser ? 'rgba(255,255,255,0.05)' : (modelObj ? PROVIDERS[modelObj.provider]?.color : 'var(--primary)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 900, color: '#fff',
                    boxShadow: !isUser ? `0 0 20px ${modelObj ? PROVIDERS[modelObj.provider]?.color : 'var(--primary)'}40` : 'none'
                  }}>
                    {isUser ? <User size={16} /> : (modelObj ? PROVIDERS[modelObj.provider]?.short : 'AI')}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {isUser ? 'Neural Command' : (modelObj ? `${modelObj.name}` : 'Neural Response')}
                  </span>
                </div>

                <div className="prose-neural" style={{ 
                  padding: '1.75rem 2.25rem', 
                  borderRadius: isUser ? '32px 32px 4px 32px' : '4px 32px 32px 32px',
                  background: isUser 
                    ? 'rgba(255, 255, 255, 0.03)' 
                    : 'linear-gradient(165deg, rgba(20, 20, 25, 0.8) 0%, rgba(5, 5, 10, 0.9) 100%)',
                  border: isUser ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isUser ? 'none' : '0 20px 60px rgba(0,0,0,0.4)',
                  fontSize: '1.05rem',
                  lineHeight: 1.8,
                  position: 'relative',
                  width: 'fit-content'
                }}>
                  <ReactMarkdown 
                    components={{
                      p: ({ children }) => <p style={{ marginBottom: '1.25rem' }}>{children}</p>,
                      a: ({ href, children }) => {
                        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(href);
                        const isVid = /\.(mp4|webm|mov)$/i.test(href);
                        const isAud = /\.(mp3|wav|ogg)$/i.test(href);

                        if (isImg) return (
                          <div style={{ margin: '1.5rem 0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
                            <img src={href} alt="Generated Asset" style={{ width: '100%', display: 'block' }} />
                          </div>
                        );
                        if (isVid) return <video src={href} controls style={{ width: '100%', borderRadius: '24px', marginTop: '1.5rem' }} />;
                        if (isAud) return <audio src={href} controls style={{ width: '100%', marginTop: '1.5rem' }} />;
                        return <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>{children}</a>;
                      }
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                  
                  {/* Message Actions */}
                  {!isUser && (
                    <div style={{ 
                      marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem',
                      display: 'flex', gap: '1.5rem', opacity: 0.3
                    }}>
                      <button onClick={() => copyToClipboard(m.content)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#fff', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {streamingMessage && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'flex-start',
              maxWidth: '85%',
              alignSelf: 'flex-start',
              paddingRight: '10%',
              animation: 'fadeInUp 0.4s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', opacity: 0.5 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#fff' }}>
                  A
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Neural Processing...</span>
              </div>
              <div className="prose-neural" style={{ 
                padding: '1.75rem 2.25rem', 
                borderRadius: '4px 32px 32px 32px',
                background: 'linear-gradient(165deg, rgba(20, 20, 25, 0.8) 0%, rgba(5, 5, 10, 0.9) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                fontSize: '1.05rem',
                lineHeight: 1.8
              }}>
                <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                <span className="cursor-blink" style={{ marginLeft: '4px', fontSize: '1.2rem', verticalAlign: 'middle' }}>▋</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '2rem 5rem 3rem',
          background: 'linear-gradient(0deg, #020202 0%, transparent 100%)',
          zIndex: 80
        }}>
          <div style={{ 
            position: 'relative',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={`Transmit to ${MODELS.find(m => m.id === selectedModel)?.name}...`}
              style={{
                width: '100%',
                minHeight: '84px',
                maxHeight: '300px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '28px',
                padding: '1.5rem 12rem 1.5rem 2rem',
                color: '#fff',
                fontSize: '1.1rem',
                outline: 'none',
                resize: 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                lineHeight: 1.6,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
              }}
            />
            
            <div style={{ 
              position: 'absolute', 
              right: '1rem', 
              bottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <button
                onClick={isStreaming ? stopGeneration : handleSend}
                disabled={loading && !isStreaming}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '20px',
                  background: isStreaming ? 'rgba(239, 68, 68, 0.2)' : (loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'var(--primary)'),
                  color: isStreaming ? '#ef4444' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer',
                  border: isStreaming ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                  boxShadow: isStreaming ? 'none' : (loading || !input.trim() ? 'none' : '0 10px 25px var(--primary-glow)')
                }}
              >
                {isStreaming ? <StopCircle size={28} /> : (loading ? <RefreshCw className="animate-spin" size={24} /> : <Send size={24} />)}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Neural Core V4.1 • Secure Synthesis Protocol • Global Matrix Sync
          </div>
        </div>
      </div>
    </div>
  );
}
