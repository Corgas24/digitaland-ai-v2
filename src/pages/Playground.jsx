/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DIGITALAND STUDIO - PERFORMANCE & RELIABILITY MANIFESTO
 * ══════════════════════════════════════════════════════════════════════════════
 * 1. UNIVERSAL COMPATIBILITY: Every model in the matrix must be 100% functional.
 * 2. ZERO-LATENCY GOAL: All UI transitions and API calls must be sub-50ms where possible.
 * 3. INTELLIGENT ROUTING: Always prioritize the fastest available node for the user.
 * 4. PREMIUM EXPERIENCE: The interface must feel 'alive', responsive, and elite.
 * ══════════════════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Send, Zap, Settings2, Trash2, Cpu, Sparkles, AlertCircle, 
  Settings, ArrowUpRight, Copy, RefreshCcw, StopCircle, 
  Terminal, Info, Search, Filter, Sliders, MessageSquare, 
  Image as ImageIcon, Film, Music, Type as TypeIcon, 
  User, RefreshCw, Command, CreditCard, Activity,
  Layers, Database, Shield, Globe, Clock, ChevronRight, X, ChevronLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getDynamicModels, PROVIDERS } from '../data/models';

export default function Playground() {
  const { user, refreshUser, isProfileLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlModel = searchParams.get('model');
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(urlModel || 'gpt-4o-mini');
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
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [latency, setLatency] = useState(0);
  const abortControllerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);
  const [models, setModels] = useState([]);
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data);
      setIsModelsLoading(false);
    });
  }, []);

  // Memoized lookups for speed
  const currentModelObj = useMemo(() => models.find(m => m.id === selectedModel), [models, selectedModel]);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConvId(null);
    setStreamingMessage('');
    setError(null);
    setLatency(0);
  };

  const loadConversation = (conv) => {
    setMessages(conv.messages || []);
    setCurrentConvId(conv.id);
    setSelectedModel(conv.model_id || 'gpt-4o-mini');
    setStreamingMessage('');
    setError(null);
  };

  const saveConversation = async (updatedMessages, modelId) => {
    if (!user || updatedMessages.length === 0) return;
    
    setIsSaving(true);
    try {
      const title = updatedMessages[0].content.substring(0, 40) + (updatedMessages[0].content.length > 40 ? '...' : '');
      
      if (currentConvId) {
        const { error } = await supabase
          .from('conversations')
          .update({ 
            messages: updatedMessages, 
            model_id: modelId,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConvId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('conversations')
          .insert([{
            user_id: user.id,
            title,
            messages: updatedMessages,
            model_id: modelId,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;
        if (data) setCurrentConvId(data.id);
      }
      fetchConversations();
    } catch (err) {
      console.error('Error saving conversation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (loading) return;
    
    if (!user) {
      setError('Acesso Negado: Inicie sessão no Neural Studio.');
      return;
    }

    if (user.balance <= 0) {
      setError('Créditos Neurais Insuficientes. Adicione fundos no Dashboard.');
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
    startTimeRef.current = Date.now();

    const executeRequest = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiKey = user.apiKeys?.[0]?.key;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        const isMedia = ['Image', 'Video', 'Audio'].includes(currentModelObj?.type);
        const defaultSystem = "You are Digitaland AI, an ultra-fast neural core. Provide precise, high-performance responses.";
        
        const response = await fetch('https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-api-key': apiKey || '',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'system', content: systemPrompt || defaultSystem }, ...newMessages.map(m => ({ role: m.role, content: m.content }))],
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            stream: !isMedia
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
                          throw new Error(data.error?.message || `Erro na Sincronizacao Neural (${response.status})`);
        }

        let assistantContent = '';
        setLatency(Date.now() - startTimeRef.current);

        if (isMedia) {
          const data = await response.json();
          assistantContent = data.data?.[0]?.url || data.choices?.[0]?.message?.content || '';
          if (assistantContent.startsWith('http')) {
            const prefix = currentModelObj?.type === 'Image' ? '!' : '';
        assistantContent = `${prefix}[Neural Output](${assistantContent})`;
          }
        } else {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let lineBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lineBuffer += decoder.decode(value, { stream: true });
            const lines = lineBuffer.split('\\n');
            lineBuffer = lines.pop() || ''; // Keep the last partial line in the buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              
              if (trimmed.startsWith('data: ')) {
                try {
                  const jsonStr = trimmed.slice(6);
                  const json = JSON.parse(jsonStr);
                  const content = json.choices?.[0]?.delta?.content || '';
                  if (content) {
                    assistantContent += content;
                    setStreamingMessage(assistantContent);
                  }
                } catch (e) {
                  // Silent catch for incomplete JSON in mid-stream
                }
              }
            }
          }
        }

        const finalMessages = [...newMessages, { role: 'assistant', content: assistantContent, modelId: selectedModel }];
        setMessages(finalMessages);
        setStreamingMessage('');
        await saveConversation(finalMessages, selectedModel);
        if (refreshUser) refreshUser();
        
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
        setIsStreaming(false);
      }
    };

    await executeRequest();
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  // High-performance filter logic
  const filteredModelsByProvider = useMemo(() => {
    const providers = {};
    Object.keys(PROVIDERS).forEach(p => {
      const pModels = models.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.provider.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = searchQuery ? true : (filterType === 'All' || m.type === filterType);
        return m.provider === p && matchesSearch && matchesType;
      });
      if (pModels.length > 0) providers[p] = pModels;
    });
    return providers;
  }, [models, searchQuery, filterType]);

  return (
    <div className="playground-container" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      width: '100%', 
      height: 'calc(100vh - 68px)', 
      background: 'var(--bg)', 
      position: 'absolute', 
      left: 0,
      top: '68px',
      overflow: 'hidden',
      zIndex: 100,
    }}>
      {isModelsLoading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2 style={{ fontWeight: 900, color: 'var(--text)' }}>Neural Studio initializing...</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Synchronizing with Neural Matrix base...</p>
        </div>
      )}

      <style>{\`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .neural-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Responsive Improvements */
        @media (max-width: 1200px) {
          .neural-sidebar {
             transform: translateX(-100%);
          }
          .neural-sidebar.open {
             transform: translateX(0);
          }
          .sidebar-toggle {
             display: flex !important;
          }
        }

        @media (max-width: 768px) {
          .viewport-container {
             padding: 1rem !important;
          }
          .status-bar {
             padding: 0 1rem !important;
             gap: 0.5rem !important;
          }
          .status-bar-info {
             display: none !important;
          }
          .input-container {
             padding: 0.75rem !important;
          }
          .welcome-title {
             font-size: 2rem !important;
          }
          .input-box {
             font-size: 0.9rem !important;
             padding: 0.75rem 3rem 0.75rem 1rem !important;
          }
        }
      \`}</style>
      {/* Dynamic Background Mesh */}
      <div className="mesh-bg" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="mesh-blob blob-1" style={{ position: 'absolute', width: '800px', height: '800px', top: '-20%', left: '-10%', opacity: 0.1, background: 'var(--primary)', borderRadius: '50%', filter: 'blur(100px)', animation: 'blob-move 20s infinite alternate' }} />
        <div className="mesh-blob blob-2" style={{ position: 'absolute', width: '600px', height: '600px', bottom: '10%', right: '-5%', opacity: 0.1, background: 'var(--secondary)', borderRadius: '50%', filter: 'blur(100px)', animation: 'blob-move 25s infinite alternate-reverse' }} />
      </div>

      <div style={{ display: 'flex', flex: 1, height: '100%', position: 'relative', width: '100%' }}>
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="sidebar-toggle"
          style={{
            position: 'absolute',
            left: '10px',
            top: '10px',
            zIndex: 120,
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'none', // Shown via media query
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)'
          }}
        >
          {showSettings ? <X size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* 1. NEURAL CORE SLIDE (LEFT - FLOATING) */}
        <div className={\`neural-sidebar \${showSettings ? 'open' : ''}\`} style={{ 
          width: '85px', 
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'var(--surface)', 
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', 
          padding: '1.5rem 0', gap: '1.5rem', zIndex: 110,
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(30px)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {[
            { id: 'Chat', icon: MessageSquare, label: 'Chat', color: '#10b981' },
            { id: 'Image', icon: ImageIcon, label: 'Images', color: '#ec4899' },
            { id: 'Video', icon: Film, label: 'Videos', color: '#f59e0b' },
            { id: 'Music', icon: Music, label: 'Music', color: '#6366f1' },
            { id: 'Reasoning', icon: Zap, label: 'Think', color: '#8b5cf6' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => { setFilterType(cat.id); setActiveTab('models'); }}
              style={{
                width: '64px', height: '64px', borderRadius: '16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                background: filterType === cat.id ? \\\`rgba(99, 102, 241, 0.1)\\\` : 'transparent',
                color: filterType === cat.id ? cat.color : 'var(--text-muted)',
                position: 'relative',
                gap: '4px'
              }}
              title={cat.label}
            >
              <cat.icon size={20} />
              <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 2. MAIN CONTENT AREA (CENTERED FOCUS) */}
        <div className="chat-main-area" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          position: 'relative',
          background: 'var(--bg-alt)',
          overflow: 'hidden',
          alignItems: 'center',
          width: '100%'
        }}>
          {/* Centralized Status Bar */}
          <div className="status-bar" style={{ 
            width: '100%',
            maxWidth: '1000px',
            height: '60px', 
            padding: '0 2rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            zIndex: 80,
            borderBottom: '1px solid var(--border-light)'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={() => setShowSettings(!showSettings)} style={{ color: 'var(--text-dim)', transition: '0.2s', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showSettings ? <Settings size={18} style={{ color: 'var(--primary)' }} /> : <Settings2 size={18} />}
                </button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
                <div className="status-bar-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <Activity size={14} color="#10b981" className="neural-pulse" />
                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Core Sync: Stable</span>
                </div>
             </div>
             
             {/* Integrated Model Selector */}
             <div style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: '0.6rem', 
               padding: '0.5rem 1.25rem', 
               background: 'var(--bg)', 
               borderRadius: '100px', 
               border: '1px solid var(--border)',
               cursor: 'pointer',
               boxShadow: 'var(--shadow-sm)',
               transition: '0.2s'
             }} onClick={() => { setActiveTab('models'); setShowSettings(true); }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-glow)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
             >
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: PROVIDERS[currentModelObj?.provider]?.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.65rem' }}>
                   {PROVIDERS[currentModelObj?.provider]?.short || 'N'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{currentModelObj?.name || selectedModel}</span>
                   <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{currentModelObj?.provider || 'Neural Engine'}</span>
                </div>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={startNewConversation} style={{ color: 'var(--text-muted)', transition: '0.2s', background: 'none', border: 'none', cursor: 'pointer' }} title="New Chat"><Trash2 size={18} /></button>
                <div style={{ background: 'var(--primary-soft)', padding: '4px 10px', borderRadius: '100px', border: '1px solid var(--primary-glow)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)' }}>${\user?.balance?.toFixed(4)}</span>
                </div>
             </div>
          </div>
          {/* Viewport (Centered Content) */}
          <div ref={scrollRef} className="viewport-container" style={{ 
            width: '100%', 
            maxWidth: '1000px', 
            flex: 1, 
            overflowY: 'auto', 
            padding: '2rem 3rem', 
            scrollbarWidth: 'none', 
            scrollBehavior: 'smooth',
            display: 'flex',
            flexDirection: 'column'
          }}>
             {messages.length === 0 && !error && (
               <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '600px', paddingBottom: '4rem' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
                    <Sparkles size={40} className="gradient-text" />
                  </div>
                  <h1 className="welcome-title" style={{ fontSize: '3rem', fontWeight: 950, color: 'var(--text)', marginBottom: '1rem', letterSpacing: '-0.05em' }}>
                    Digitaland <span className="gradient-text">Studio</span>
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1.6, fontWeight: 500, marginBottom: '3rem' }}>
                    Experience the future of AI. Your personal command center for high-fidelity research and creative execution.
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                      { t: 'Analise este código para otimização', i: Cpu, c: '#6366f1' },
                      { t: 'Gere uma imagem hiper-realista', i: ImageIcon, c: '#ec4899' },
                      { t: 'Explique física quântica simplesmente', i: Zap, c: '#f59e0b' },
                      { t: 'Traduza este texto para 5 idiomas', i: Globe, c: '#10b981' }
                    ].map((item, idx) => (
                      <button key={idx} onClick={() => setInput(item.t)} style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} 
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.borderColor = item.c;
                          e.currentTarget.style.boxShadow = \\`0 10px 30px ${item.c}15\\`;
                        }} 
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <item.i size={20} style={{ marginBottom: '1rem', color: item.c }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{item.t}</div>
                      </button>
                    ))}
                  </div>
               </div>
             )}

             {error && (
               <div style={{ padding: '1rem 1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '16px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', alignSelf: 'center', width: '100%' }}>
                  <AlertCircle size={18} /> {error}
               </div>
             )}

             <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {messages.map((m, i) => {
                  const isUser = m.role === 'user';
                  const model = models.find(mod => mod.id === m.modelId) || currentModelObj;
                  const provider = PROVIDERS[model?.provider] || { color: 'var(--primary)', short: 'AI' };
                  return (
                    <div key={i} style={{ 
                      display: 'flex', flexDirection: 'column', 
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '100%'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', opacity: 0.6, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                         <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: isUser ? 'var(--primary)' : provider.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            {isUser ? <User size={12} /> : provider.short}
                         </div>
                         <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>{isUser ? 'Client Command' : (model?.name || 'Digitaland Response')}</span>
                      </div>
                      <div style={{ 
                        maxWidth: '85%', padding: '1.25rem 1.75rem', borderRadius: isUser ? '24px 4px 24px 24px' : '4px 24px 24px 24px',
                        background: isUser ? 'var(--primary)' : 'var(--surface)',
                        color: isUser ? '#fff' : 'var(--text)',
                        border: '1px solid var(--border-light)',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative'
                      }}>
                        <div className="prose" style={{ color: 'inherit', fontSize: '1rem', lineHeight: '1.6' }}>
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                        {!isUser && (
                           <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '1rem' }}>
                              <button onClick={() => copyToClipboard(m.content)} style={{ color: 'inherit', opacity: 0.6, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer' }}><Copy size={10} /> Copy</button>
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })}

                {(loading || isStreaming) && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', opacity: 0.5 }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Activity size={12} className="neural-pulse" />
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                          Digitaland Processing...
                        </span>
                     </div>
                      {(streamingMessage || loading) && (
                        <div style={{ 
                          maxWidth: '85%',
                          padding: '1.25rem 1.75rem', borderRadius: '4px 24px 24px 24px', 
                          background: 'var(--surface)', border: '1px solid var(--border)', 
                          color: 'var(--text)', fontSize: '1rem', lineHeight: 1.7
                        }}>
                          {streamingMessage ? (
                            <>
                              <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                              <span className="cursor-blink" style={{ marginLeft: '4px' }}>▋</span>
                            </>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '24px' }}>
                              <div className="dot-pulse" style={{ animationDelay: '0s' }} />
                              <div className="dot-pulse" style={{ animationDelay: '0.2s' }} />
                              <div className="dot-pulse" style={{ animationDelay: '0.4s' }} />
                            </div>
                          )}
                       </div>
                     )}
                  </div>
                )}
             </div>
          </div>

          {/* Neural Dock (Integrated Input) */}
          <div className="input-container" style={{ width: '100%', maxWidth: '1000px', padding: '1.5rem 2rem 2rem', background: 'transparent', position: 'relative', zIndex: 100 }}>
            <div style={{ width: '100%', position: 'relative', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '10px' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={\\`Engage with ${selectedModel}...\\`}
                className="input-box"
                style={{
                  width: '100%',
                  padding: '1rem 4rem 1rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'var(--text)',
                  fontSize: '1.1rem',
                  lineHeight: '1.5',
                  resize: 'none',
                  minHeight: '56px',
                  maxHeight: '250px',
                  outline: 'none'
                }}
              />
              <div style={{ position: 'absolute', right: '12px', bottom: '12px' }}>
                <button 
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '16px',
                    background: input.trim() ? 'var(--primary)' : 'var(--border)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: input.trim() ? '0 5px 15px var(--primary-glow)' : 'none'
                  }}
                  onMouseEnter={e => input.trim() && (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {loading ? <RefreshCw size={20} className="animate-spin" /> : <ArrowUpRight size={24} />}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
              Digitaland Studio v5.0 • High Fidelity Core • Digitaland AI
            </div>
          </div>
        </div>

        {/* 3. NEURAL CONFIG PANEL (FLOATING SIDEBAR) */}
        {showSettings && (
          <aside style={{ 
            width: '340px', 
            position: 'absolute',
            right: '20px',
            top: '20px',
            bottom: '20px',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', 
            background: 'var(--surface)',
            backdropFilter: 'blur(40px)',
            boxShadow: 'var(--shadow-xl)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', 
            zIndex: 150,
            animation: 'fadeInRight 0.4s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Digitaland Models</h3>
                 <button onClick={() => setShowSettings(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', background: 'var(--bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                {[
                  { id: 'models', label: 'Models', icon: Cpu },
                  { id: 'params', label: 'Tuning', icon: Sliders },
                  { id: 'history', label: 'Vault', icon: RefreshCcw }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, background: activeTab === tab.id ? 'var(--surface)' : 'transparent', color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)', transition: '0.2s', border: 'none', cursor: 'pointer' }}>
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', scrollbarWidth: 'none' }}>
              {activeTab === 'models' && (
                <>
                  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input type="text" placeholder="Search models matrix..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'var(--text)', fontSize: '0.85rem', outline: 'none' }} />
                  </div>
                  {Object.entries(filteredModelsByProvider).map(([provider, pModels]) => (
                    <div key={provider} style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{provider}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {pModels.map(model => {
                          const isSelected = selectedModel === model.id;
                          return (
                            <button key={model.id} onClick={() => { setSelectedModel(model.id); setShowSettings(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', borderRadius: '12px', border: '1px solid transparent', textAlign: 'left', background: isSelected ? 'var(--primary-soft)' : 'transparent', borderColor: isSelected ? 'var(--primary-glow)' : 'transparent', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', transition: '0.2s', width: '100%' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: isSelected ? 'var(--primary)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={16} color={isSelected ? '#fff' : 'var(--text-muted)'} /></div>
                              <div style={{ flex: 1 }}><div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{model.name}</div></div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'params' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  <div>
                     <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>System Context</label>
                     <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Behavioral instructions for the neural core..." style={{ width: '100%', height: '200px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.25rem', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', resize: 'none' }} />
                  </div>
                  {[
                    { label: 'Creativity', val: temperature, set: setTemperature, min: 0, max: 2, step: 0.1 },
                    { label: 'Response Depth', val: maxTokens, set: setMaxTokens, min: 256, max: 128000, step: 1024 },
                    { label: 'Prob. Threshold', val: topP, set: setTopP, min: 0, max: 1, step: 0.05 }
                  ].map(p => (
                    <div key={p.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.label}</label><span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)' }}>{p.val}</span></div>
                      <input type="range" min={p.min} max={p.max} step={p.step} value={p.val} onChange={(e) => p.set && p.set(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', height: '4px' }} />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <button onClick={startNewConversation} style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 900, marginBottom: '1rem', boxShadow: '0 5px 15px var(--primary-glow)' }}>New Digitaland Link</button>
                  {conversations.map(conv => (
                    <button key={conv.id} onClick={() => { loadConversation(conv); setShowSettings(false); }} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: currentConvId === conv.id ? 'var(--primary-soft)' : 'transparent', border: '1px solid', borderColor: currentConvId === conv.id ? 'var(--primary-glow)' : 'transparent', textAlign: 'left', transition: '0.2s' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: currentConvId === conv.id ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(conv.updated_at).toLocaleDateString()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-light)', background: 'transparent' }}>
               <div style={{ background: 'var(--primary-soft)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--primary-glow)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Digitaland Credits</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, fontFamily: 'var(--mono)', color: 'var(--text)' }}>${\user?.balance?.toFixed(5) || '0.00000'}</div>
                  <button onClick={() => navigate('/dashboard?tab=billing')} style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 900 }}>RECHARGE BALANCE</button>
               </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default Playground;
