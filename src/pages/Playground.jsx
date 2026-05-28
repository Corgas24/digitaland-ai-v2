import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Send, Trash2, Sparkles, AlertCircle, Copy, RefreshCw, X, 
  ChevronDown, Plus, Settings2, ArrowUp, Check,
  Paperclip, Layers, Search, Sun, Moon,
  CreditCard, Key, Activity, Shield, BookOpen, LayoutGrid, 
  MessageCircle, HelpCircle, ChevronRight, User, LogOut
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';
import { getDynamicModels, PROVIDERS } from '../data/models';
import { safeFetch } from '../lib/safeFetch';

/* ═══════════════════════════════════════════════════════════════════
   SANITIZE PROVIDER ERRORS
   ═══════════════════════════════════════════════════════════════════ */
const sanitizeProviderError = (msg) => {
  if (!msg) return 'Unknown network error.';
  if (msg instanceof Error) return sanitizeProviderError(msg.message);
  const msgStr = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
  const hasChinese = /[\u4e00-\u9fa5]/.test(msgStr);
  const isInvalidToken = msgStr.includes('无效的令牌') || /invalid\s+token|unauthorized|invalid\s+api\s+key/i.test(msgStr);
  const isUserOutOfBalance = /insufficient balance|payment required/i.test(msgStr);
  const isChannelOutOfBalance = /quota|insufficient_funds|out of balance/i.test(msgStr);

  if (hasChinese || isInvalidToken) return 'Provider credentials invalid or temporarily unavailable.';
  if (isUserOutOfBalance) return 'Insufficient balance. Please add credits to continue.';
  if (isChannelOutOfBalance) return 'Upstream channel quota exhausted. Try an alternative model.';
  if (msgStr.includes('Failed to fetch') || msgStr.includes('NetworkError')) return 'Connection failed. Check your internet.';
  return msgStr;
};

/* ═══════════════════════════════════════════════════════════════════
   SUGGESTION CHIPS
   ═══════════════════════════════════════════════════════════════════ */
const SUGGESTIONS = [
  { title: 'Email to client', sub: 'Draft a professional update' },
  { title: 'Code review', sub: 'Find bugs & optimize' },
  { title: 'Market analysis', sub: 'Business intelligence' },
  { title: 'Meeting notes', sub: 'Decisions & actions' },
  { title: 'Debug code', sub: 'Fix errors fast' },
  { title: 'Content strategy', sub: 'SEO & marketing' },
];

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function Playground() {
  const { user, refreshUser, isProfileLoading, logout } = useAuth();
  const { openPaymentModal } = usePayment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlModel = searchParams.get('model');

  // Theme
  const [isDark, setIsDark] = useState(true);

  // Multi-Model Workspace
  const [activeTabs, setActiveTabs] = useState(['gpt-4o-mini']);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Modal search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  // System
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [models, setModels] = useState([]);
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const abortControllersRef = useRef({});
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Theme sync
  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme');
    setIsDark(t === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setIsDark(!isDark);
  };

  // 1. Fetch Dynamic Models
  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data ?? []);
      setIsModelsLoading(false);
      if (urlModel && data?.some(m => m.id === urlModel)) {
        setActiveTabs([urlModel]);
        setActiveTabIdx(0);
      } else if (data?.length > 0) {
        const defaults = ['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.5-pro', 'deepseek-chat']
          .filter(id => data.some(m => m.id === id));
        setActiveTabs(defaults.length > 0 ? defaults : [data[0].id]);
        setActiveTabIdx(0);
      }
    }).catch(() => setIsModelsLoading(false));
  }, [urlModel]);

  const activeModelsForQuery = useMemo(() => {
    return compareMode ? activeTabs : [activeTabs[activeTabIdx]];
  }, [compareMode, activeTabs, activeTabIdx]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { if (user) fetchConversations(); }, [user]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; }
  }, [input]);

  /* ── Data operations ─────────────────────────────────────────── */
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('conversations').select('*')
        .eq('user_id', user.id).order('updated_at', { ascending: false });
      setConversations(data || []);
    } catch (err) { console.error(err); }
  };

  const startNewConversation = () => { setMessages([]); setCurrentConvId(null); setError(null); };

  const loadConversation = (conv) => {
    setMessages(conv.messages || []);
    setCurrentConvId(conv.id);
    if (conv.model_id) {
      try {
        const ids = JSON.parse(conv.model_id);
        if (Array.isArray(ids) && ids.length > 0) { setActiveTabs(ids); setActiveTabIdx(0); }
        else { setActiveTabs([conv.model_id]); setActiveTabIdx(0); }
      } catch { setActiveTabs([conv.model_id]); setActiveTabIdx(0); }
    }
    setError(null);
  };

  const saveConversation = async (msgs, openIds) => {
    if (!user || msgs.length === 0) return;
    setIsSaving(true);
    try {
      const title = msgs[0].content.substring(0, 45) + (msgs[0].content.length > 45 ? '...' : '');
      const mid = JSON.stringify(openIds);
      if (currentConvId) {
        await supabase.from('conversations').update({ messages: msgs, model_id: mid, updated_at: new Date().toISOString() }).eq('id', currentConvId);
      } else {
        const { data } = await supabase.from('conversations').insert([{ user_id: user.id, title, messages: msgs, model_id: mid, updated_at: new Date().toISOString() }]).select().single();
        if (data) setCurrentConvId(data.id);
      }
      fetchConversations();
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  /* ── Inference engine ────────────────────────────────────────── */
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!user) { setError('Session expired. Please sign in.'); return; }
    const hasNoCredits = !user.isAdmin && (!user.balance || user.balance <= 0.001);
    const userMessage = { role: 'user', content: input, timestamp: Date.now() };
    const assistantPlaceholder = {
      role: 'assistant', compare: true,
      responses: activeModelsForQuery.reduce((acc, mId) => {
        acc[mId] = { content: '', latency: 0, loading: !hasNoCredits, error: hasNoCredits ? 'balance' : null };
        return acc;
      }, {})
    };
    const nextMessages = [...messages, userMessage, assistantPlaceholder];
    setMessages(nextMessages); setInput(''); setError(null);
    if (hasNoCredits) { setError('Insufficient balance. Please add credits.'); openPaymentModal(); return; }
    setLoading(true);

    const updateResponse = (modelId, fn) => {
      setMessages(prev => {
        const next = [...prev]; const last = next[next.length - 1];
        if (last?.role === 'assistant' && last.responses?.[modelId]) {
          last.responses = { ...last.responses, [modelId]: fn(last.responses[modelId]) };
        }
        return next;
      });
    };

    const runInference = async (mId) => {
      const startTime = Date.now();
      const controller = new AbortController();
      abortControllersRef.current[mId] = controller;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiKey = user.apiKeys?.[0]?.key;
        const mObj = models.find(m => m.id === mId);
        const headers = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
        else if (apiKey) headers['x-api-key'] = apiKey;
        const isMedia = ['Image', 'Video', 'Audio'].includes(mObj?.type);
        const sysCtx = systemPrompt || "You are Digitaland AI, a secure multi-model gateway. Be precise and helpful.";
        const payload = [
          { role: 'system', content: sysCtx },
          ...messages.filter(m => m.role === 'user' || (m.role === 'assistant' && !m.compare)).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage.content }
        ];
        const response = await safeFetch('/v1/chat/completions', {
          method: 'POST', headers, signal: controller.signal,
          body: JSON.stringify({ model: mId, messages: payload, temperature, max_tokens: maxTokens, top_p: topP, stream: !isMedia })
        });
        if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error?.message || `Error ${response.status}`); }
        let text = '';
        if (isMedia) {
          const d = await response.json();
          text = d.data?.[0]?.url || d.choices?.[0]?.message?.content || '';
          if (text.startsWith('http')) text = `${mObj?.type === 'Image' ? '!' : ''}[Output](${text})`;
          updateResponse(mId, p => ({ ...p, content: text, loading: false, latency: Date.now() - startTime }));
        } else {
          const reader = response.body.getReader(); const decoder = new TextDecoder(); let buf = '';
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            buf += decoder.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || '';
            for (const line of lines) {
              const t = line.trim(); if (!t || t === 'data: [DONE]') continue;
              if (t.startsWith('data: ')) {
                try { const d = JSON.parse(t.slice(6)); const c = d.choices?.[0]?.delta?.content || '';
                  if (c) { text += c; updateResponse(mId, p => ({ ...p, content: text })); }
                } catch {}
              }
            }
          }
          updateResponse(mId, p => ({ ...p, loading: false, latency: Date.now() - startTime }));
        }
      } catch (err) {
        if (err.name !== 'AbortError') updateResponse(mId, p => ({ ...p, loading: false, error: sanitizeProviderError(err.message) }));
      }
    };

    await Promise.all(activeModelsForQuery.map(mId => runInference(mId)));
    setLoading(false);
    await saveConversation(nextMessages, activeModelsForQuery);
    if (refreshUser) await refreshUser();
  };

  const stopAll = () => {
    Object.values(abortControllersRef.current).forEach(c => c?.abort());
    setLoading(false);
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); setCopiedText(true); setTimeout(() => setCopiedText(false), 1500); };

  /* ── Model filtering ─────────────────────────────────────────── */
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (!m) return false;
      const q = searchQuery.toLowerCase();
      const match = !q || (m.name || '').toLowerCase().includes(q) || (m.provider || '').toLowerCase().includes(q);
      return (filterType === 'All' ? match : m.type === filterType && match);
    });
  }, [models, searchQuery, filterType]);

  const modelsByProvider = useMemo(() => {
    const g = {};
    filteredModels.forEach(m => { const p = m.provider || 'Other'; if (!g[p]) g[p] = []; g[p].push(m); });
    return g;
  }, [filteredModels]);

  const addModelTab = (id) => {
    if (!activeTabs.includes(id)) { setActiveTabs([...activeTabs, id]); setActiveTabIdx(activeTabs.length); }
    else setActiveTabIdx(activeTabs.indexOf(id));
    setIsAddModalOpen(false);
  };

  const closeTab = (e, i) => {
    e.stopPropagation(); if (activeTabs.length <= 1) return;
    const t = activeTabs.filter((_, j) => j !== i); setActiveTabs(t);
    if (activeTabIdx >= t.length) setActiveTabIdx(t.length - 1);
  };

  const currentModel = models.find(m => m.id === activeTabs[activeTabIdx]) || models[0];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="pg-root">
      <style>{`
/* ══════════════════════════════════════════════════════════════════
   DIGITALAND PLAYGROUND — Production Chat Interface
   ══════════════════════════════════════════════════════════════════ */

.pg-root {
  display: flex;
  width: 100vw;
  height: 100vh;
  position: fixed;
  inset: 0;
  z-index: 9500;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
  background: var(--bg);
  overflow: hidden;
}

/* ─── LEFT SIDEBAR ─────────────────────────────────────────────── */
.pg-side {
  width: 200px;
  min-width: 200px;
  background: var(--bg);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  overflow: hidden;
}
.pg-side-nav {
  flex: 1;
  padding: 0.75rem 0.65rem;
  overflow-y: auto;
  scrollbar-width: none;
}
.pg-side-nav::-webkit-scrollbar { display: none; }

.pg-side-group {
  margin-bottom: 1.25rem;
}
.pg-side-group-title {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  padding: 0 0.5rem;
  margin-bottom: 0.35rem;
}
.pg-side-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.55rem;
  border-radius: 7px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  text-decoration: none;
}
.pg-side-link:hover {
  color: var(--text);
  background: var(--surface);
}
.pg-side-link.active {
  color: var(--text);
  background: var(--surface);
  font-weight: 600;
  border: 1px solid var(--border-light);
}

/* Help + theme toggle */
.pg-side-bottom {
  padding: 0.65rem;
  border-top: 1px solid var(--border-light);
}
.pg-help-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 7px;
  transition: all 0.12s;
  text-decoration: none;
}
.pg-help-link:hover {
  color: var(--text);
  background: var(--surface);
}
.pg-theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 7px;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: all 0.12s;
}
.pg-theme-toggle:hover {
  color: var(--text);
  background: var(--surface);
}

/* User card at bottom */
.pg-user-card {
  padding: 0.65rem;
  border-top: 1px solid var(--border-light);
}
.pg-user-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.4rem;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.pg-user-row:hover {
  background: var(--surface);
}
.pg-user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}
.pg-user-info {
  flex: 1;
  min-width: 0;
}
.pg-user-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-user-balance {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}
.pg-user-chevron {
  color: var(--text-muted);
  opacity: 0.5;
}

/* User dropdown menu */
.pg-user-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  padding: 0.35rem;
  z-index: 500;
  animation: pg-menu-up 0.15s ease;
}
@keyframes pg-menu-up {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.pg-user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  text-decoration: none;
  transition: all 0.1s;
}
.pg-user-menu-item:hover {
  background: var(--surface);
  color: var(--text);
}
.pg-user-menu-item.danger:hover {
  color: #ef4444;
  background: rgba(239,68,68,0.06);
}
.pg-user-menu-sep {
  height: 1px;
  background: var(--border-light);
  margin: 0.25rem 0;
}

/* ─── MAIN WORKSPACE ───────────────────────────────────────────── */
.pg-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  background: var(--bg-alt);
}

/* Top bar with brand + tabs */
.pg-topbar {
  display: flex;
  align-items: center;
  height: 44px;
  min-height: 44px;
  border-bottom: 1px solid var(--border-light);
  padding: 0 0.75rem;
  background: var(--bg-alt);
  gap: 0;
  overflow: hidden;
}

.pg-topbar-brand {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-right: 0.85rem;
  margin-right: 0.35rem;
  border-right: 1px solid var(--border-light);
  cursor: pointer;
  flex-shrink: 0;
}
.pg-topbar-brand-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pg-topbar-brand-text {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  white-space: nowrap;
}
.pg-topbar-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.12s;
  flex-shrink: 0;
}
.pg-topbar-copy-btn:hover {
  opacity: 1;
  background: var(--surface);
}

/* Tab strip */
.pg-tabs {
  display: flex;
  align-items: center;
  gap: 1px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  height: 100%;
}
.pg-tabs::-webkit-scrollbar { display: none; }

.pg-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.75rem;
  height: 100%;
  font-size: 0.78rem;
  font-weight: 550;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s;
  position: relative;
  border-bottom: 2px solid transparent;
}
.pg-tab:hover { color: var(--text); }
.pg-tab.active {
  color: var(--text);
  font-weight: 650;
}
.pg-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
  border-radius: 2px 2px 0 0;
}
.pg-tab-logo {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  object-fit: contain;
}
.pg-tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.1s;
  flex-shrink: 0;
}
.pg-tab:hover .pg-tab-close { opacity: 0.5; }
.pg-tab-close:hover {
  opacity: 1 !important;
  background: var(--border-light);
}

.pg-tab-add {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 0.65rem;
  height: 100%;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s;
  flex-shrink: 0;
}
.pg-tab-add:hover { color: var(--primary); }

/* Compare mode pill — right side of topbar */
.pg-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  padding-left: 0.5rem;
  flex-shrink: 0;
}
.pg-mode-pill {
  display: flex;
  background: var(--bg);
  border: 1px solid var(--border-light);
  padding: 2px;
  border-radius: 6px;
}
.pg-mode-btn {
  font-size: 0.68rem;
  font-weight: 650;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.pg-mode-btn.active {
  background: var(--bg-alt);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* ─── CHAT VIEWPORT ────────────────────────────────────────────── */
.pg-viewport {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  position: relative;
}
.pg-viewport::-webkit-scrollbar { width: 5px; }
.pg-viewport::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.pg-viewport::-webkit-scrollbar-track { background: transparent; }

.pg-chat-wrap {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 8rem;
}

/* Empty state */
.pg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 100%;
  padding: 2rem 1rem;
}
.pg-empty-spacer { flex: 1; }

/* User message */
.pg-msg-user {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}
.pg-msg-user-text {
  max-width: 72%;
  background: #1e293b;
  color: #f1f5f9;
  padding: 0.7rem 1rem;
  border-radius: 16px 16px 4px 16px;
  font-size: 0.88rem;
  line-height: 1.55;
  word-wrap: break-word;
}
[data-theme="dark"] .pg-msg-user-text {
  background: #e2e8f0;
  color: #1e293b;
}

/* Assistant message card */
.pg-msg-ai {
  margin-bottom: 1.5rem;
}
.pg-msg-card {
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 0.85rem 1.1rem;
  transition: border-color 0.2s;
}
.pg-msg-card.streaming {
  border-color: rgba(129,140,248,0.3);
}
.pg-msg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border-light);
}
.pg-msg-model {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.pg-msg-logo {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: contain;
}
.pg-msg-name {
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
}
.pg-msg-latency {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.pg-msg-body {
  font-size: 0.88rem;
  line-height: 1.65;
  overflow-wrap: break-word;
}
.pg-msg-body p { margin: 0 0 0.65rem; }
.pg-msg-body p:last-child { margin: 0; }
.pg-msg-body pre {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 0.75rem;
  overflow-x: auto;
  font-size: 0.8rem;
  margin: 0.5rem 0;
}
.pg-msg-body code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
}
.pg-msg-body ul, .pg-msg-body ol { padding-left: 1.25rem; margin: 0.4rem 0; }
.pg-msg-body li { margin-bottom: 0.2rem; }
.pg-msg-body img { max-width: 100%; border-radius: 8px; margin: 0.5rem 0; }

.pg-msg-footer {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.5rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--border-light);
}
.pg-copy-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s;
}
.pg-copy-btn:hover { background: var(--surface); color: var(--text); }

/* Compare grid */
.pg-compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

/* Loading dots */
.pg-dots {
  display: flex; gap: 4px; padding: 0.75rem 0; align-items: center;
}
.pg-dots span {
  width: 5px; height: 5px; border-radius: 50%; background: var(--text-muted);
  animation: pg-pulse 1.4s infinite ease-in-out both;
}
.pg-dots span:nth-child(1) { animation-delay: -0.32s; }
.pg-dots span:nth-child(2) { animation-delay: -0.16s; }
@keyframes pg-pulse {
  0%,80%,100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* Cursor blink */
.pg-cursor {
  display: inline-block; width: 2px; height: 1em;
  background: var(--primary); margin-left: 2px;
  animation: pg-blink 1s step-end infinite; vertical-align: text-bottom;
}
@keyframes pg-blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* No balance */
.pg-no-bal { padding: 0.75rem 0; }
.pg-no-bal-head { display: flex; align-items: center; gap: 0.35rem; color: #ef4444; font-weight: 700; font-size: 0.82rem; margin-bottom: 0.25rem; }
.pg-no-bal-text { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.65rem; }
.pg-no-bal-btn { padding: 0.35rem 0.75rem; background: var(--text); color: var(--bg); border: none; border-radius: 7px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

/* Error */
.pg-error {
  display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 0.85rem;
  background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.1);
  border-radius: 8px; color: #ef4444; font-size: 0.78rem; margin-bottom: 1rem;
}

/* ─── SUGGESTION CHIPS ─────────────────────────────────────────── */
.pg-chips-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 0.25rem 0.75rem;
  margin-bottom: 0.25rem;
}
.pg-chips-row::-webkit-scrollbar { display: none; }
.pg-chip {
  flex-shrink: 0;
  padding: 0.55rem 0.85rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 140px;
  max-width: 180px;
}
.pg-chip:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
  transform: translateY(-1px);
}
.pg-chip-title {
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text);
  margin-bottom: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-chip-sub {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* ─── INPUT DOCK ───────────────────────────────────────────────── */
.pg-dock {
  padding: 0 1.5rem 1rem;
  background: var(--bg-alt);
  position: relative;
  z-index: 50;
}
.pg-dock-inner {
  max-width: 800px;
  margin: 0 auto;
}
.pg-dock-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.45rem 0.6rem;
  transition: border-color 0.15s;
}
.pg-dock-box:focus-within {
  border-color: var(--text-muted);
}
.pg-dock-textarea {
  width: 100%;
  background: transparent;
  border: none;
  resize: none;
  min-height: 22px;
  max-height: 180px;
  color: var(--text);
  font-size: 0.88rem;
  line-height: 1.45;
  outline: none;
  font-family: inherit;
  padding: 0.3rem 0.35rem;
}
.pg-dock-textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}
.pg-dock-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.2rem;
}
.pg-dock-left {
  display: flex;
  align-items: center;
  gap: 0.1rem;
}
.pg-dock-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.1s;
}
.pg-dock-btn:hover { background: var(--surface); color: var(--text); }
.pg-dock-count {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 650;
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid var(--border-light);
  margin-left: 0.15rem;
}
.pg-dock-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.pg-send-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--text);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.12s;
}
.pg-send-btn:hover:not(:disabled) { opacity: 0.82; transform: scale(1.03); }
.pg-send-btn:disabled { opacity: 0.15; cursor: not-allowed; }

/* ─── SETTINGS DRAWER ──────────────────────────────────────────── */
.pg-drawer {
  width: 280px;
  min-width: 280px;
  border-left: 1px solid var(--border-light);
  background: var(--bg);
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: pg-slide 0.2s ease;
}
@keyframes pg-slide {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
.pg-drawer-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-light);
}
.pg-drawer-title {
  font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.pg-drawer-x {
  width: 26px; height: 26px; border-radius: 6px; border: none;
  background: var(--surface); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.pg-drawer-body {
  flex: 1; overflow-y: auto; padding: 1rem;
}
.pg-drawer-label {
  font-size: 0.65rem; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.5rem; display: block;
}
.pg-drawer-ta {
  width: 100%; height: 100px; background: var(--surface);
  border: 1px solid var(--border-light); border-radius: 8px;
  padding: 0.55rem; font-size: 0.8rem; outline: none; resize: none;
  color: var(--text); font-family: inherit; margin-bottom: 1rem;
}
.pg-slider-group { margin-bottom: 0.85rem; }
.pg-slider-row { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 550; margin-bottom: 0.2rem; }
.pg-slider-val { color: var(--primary); font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
.pg-slider-input { width: 100%; height: 3px; accent-color: var(--primary); }

/* ─── ADD MODEL MODAL ──────────────────────────────────────────── */
.pg-modal-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px); z-index: 99999;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.pg-modal {
  width: 100%; max-width: 560px; max-height: 72vh;
  background: var(--bg); border: 1px solid var(--border); border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); display: flex; flex-direction: column;
  overflow: hidden; animation: pg-modal-in 0.18s ease;
}
@keyframes pg-modal-in {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.pg-modal-top {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-light);
}
.pg-modal-t { font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 800; }
.pg-modal-x {
  width: 26px; height: 26px; border-radius: 6px; border: none;
  background: var(--surface); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.pg-modal-body { flex: 1; overflow-y: auto; padding: 1rem; }
.pg-modal-search {
  position: relative; margin-bottom: 0.85rem;
}
.pg-modal-search-i {
  position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); opacity: 0.4;
}
.pg-modal-search-in {
  width: 100%; background: var(--surface); border: 1px solid var(--border-light);
  border-radius: 8px; padding: 0.5rem 0.75rem 0.5rem 2rem;
  color: var(--text); font-size: 0.82rem; outline: none;
}
.pg-modal-filters {
  display: flex; gap: 0.3rem; overflow-x: auto; scrollbar-width: none; margin-bottom: 1rem;
}
.pg-modal-filters::-webkit-scrollbar { display: none; }
.pg-filter {
  padding: 0.25rem 0.6rem; border-radius: 5px;
  background: var(--surface); border: 1px solid var(--border-light);
  font-size: 0.7rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; color: var(--text-muted); transition: all 0.1s;
}
.pg-filter.on { background: var(--text); color: var(--bg); border-color: var(--text); }
.pg-prov-label {
  font-size: 0.62rem; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem;
}
.pg-m-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 0.4rem; margin-bottom: 1.25rem; }
.pg-m-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 0.65rem; border-radius: 8px;
  border: 1px solid var(--border-light); background: var(--bg-alt);
  cursor: pointer; transition: all 0.12s;
}
.pg-m-item:hover { border-color: var(--primary); background: var(--primary-soft); }
.pg-m-name { font-size: 0.78rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pg-m-badge { font-size: 0.62rem; font-weight: 700; white-space: nowrap; }

/* Toast */
.pg-toast {
  position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%);
  background: var(--text); color: var(--bg);
  padding: 0.5rem 0.85rem; border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.15);
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.78rem; font-weight: 600; z-index: 999999;
  animation: pg-toast-in 0.2s ease;
}
@keyframes pg-toast-in {
  from { transform: translateX(-50%) translateY(8px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

/* ─── MOBILE ───────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .pg-side { display: none; }
  .pg-topbar { padding: 0 0.5rem; }
  .pg-topbar-brand-text { display: none; }
  .pg-compare-grid { grid-template-columns: 1fr; }
  .pg-chat-wrap { padding: 1rem 0.75rem 7rem; }
  .pg-msg-user-text { max-width: 85%; font-size: 0.85rem; }
  .pg-msg-body { font-size: 0.85rem; }
  .pg-dock { padding: 0 0.75rem 0.65rem; }
  .pg-chip { min-width: 120px; }
  .pg-drawer {
    position: fixed; right: 0; top: 0; bottom: 0;
    width: 260px; min-width: 260px; z-index: 9500;
    box-shadow: -8px 0 28px rgba(0,0,0,0.12);
  }
  .pg-modal { max-height: 85vh; }
  .pg-m-grid { grid-template-columns: 1fr; }
}
@media (max-width: 420px) {
  .pg-topbar-copy-btn { display: none; }
  .pg-topbar-right { gap: 0.25rem; }
  .pg-chip { min-width: 110px; padding: 0.45rem 0.65rem; }
}
      `}</style>

      {/* ═══ A. LEFT SIDEBAR ═══ */}
      <aside className="pg-side">
        <div className="pg-side-nav">
          <div className="pg-side-group">
            <div className="pg-side-group-title">Platform</div>
            <button className="pg-side-link active" onClick={() => navigate('/playground')}>
              <Sparkles size={16} /> Playground
            </button>
            <button className="pg-side-link" onClick={() => { window.location.href = '/dashboard?tab=billing'; }}>
              <CreditCard size={16} /> Billing
            </button>
            <button className="pg-side-link" onClick={() => { window.location.href = '/dashboard?tab=keys'; }}>
              <Key size={16} /> API Keys
            </button>
            <button className="pg-side-link" onClick={() => { window.location.href = '/dashboard?tab=usage'; }}>
              <Activity size={16} /> Usage
            </button>
            <button className="pg-side-link" onClick={() => { window.location.href = '/dashboard?tab=logs'; }}>
              <Activity size={16} /> Logs
            </button>
            {user?.isAdmin && (
              <button className="pg-side-link" onClick={() => navigate('/admin')} style={{ color: 'var(--secondary)' }}>
                <Shield size={16} /> Admin
              </button>
            )}
          </div>

          <div className="pg-side-group">
            <div className="pg-side-group-title">Quick Links</div>
            <button className="pg-side-link" onClick={() => navigate('/models')}>
              <LayoutGrid size={16} /> Models Gallery
            </button>
            <button className="pg-side-link" onClick={() => navigate('/docs')}>
              <BookOpen size={16} /> Documentation
            </button>
            <a href="https://discord.gg/digitaland" target="_blank" rel="noreferrer" className="pg-side-link" style={{ textDecoration: 'none' }}>
              <MessageCircle size={16} /> Join Discord
            </a>
          </div>
        </div>

        <div className="pg-side-bottom">
          <button className="pg-help-link" onClick={() => navigate('/docs')}>
            <HelpCircle size={15} /> Need help? <span style={{ opacity: 0.5, fontSize: '0.68rem' }}>Answers here</span>
          </button>
          <button className="pg-theme-toggle" onClick={toggleTheme}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        <div className="pg-user-card">
          <div className="pg-user-row" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="pg-user-avatar">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="pg-user-info">
              <div className="pg-user-name">{user?.name || user?.email?.split('@')[0] || 'User'}</div>
              <div className="pg-user-balance">
                {isProfileLoading ? '...' : `$${user?.balance?.toFixed(2) || '0.00'}`}
              </div>
            </div>
            <ChevronDown size={13} className="pg-user-chevron" />

            {userMenuOpen && (
              <div className="pg-user-menu" onClick={e => e.stopPropagation()}>
                <button className="pg-user-menu-item" onClick={() => { setUserMenuOpen(false); navigate('/dashboard'); }}>
                  <User size={14} /> Dashboard
                </button>
                <button className="pg-user-menu-item" onClick={() => openPaymentModal()}>
                  <CreditCard size={14} /> Add Credits
                </button>
                <div className="pg-user-menu-sep" />
                <button className="pg-user-menu-item danger" onClick={() => { logout(); navigate('/'); }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ B. MAIN WORKSPACE ═══ */}
      <div className="pg-main">
        {/* Top bar: brand + tabs + controls */}
        <div className="pg-topbar">
          <div className="pg-topbar-brand" onClick={() => navigate('/')}>
            <div className="pg-topbar-brand-icon">
              <Sparkles size={12} color="#fff" />
            </div>
            <span className="pg-topbar-brand-text">Digitaland</span>
          </div>

          <div className="pg-tabs">
            {activeTabs.map((mId, i) => {
              const mObj = models.find(m => m.id === mId);
              const prov = PROVIDERS[mObj?.provider];
              return (
                <button key={mId} className={`pg-tab ${activeTabIdx === i ? 'active' : ''}`} onClick={() => setActiveTabIdx(i)}>
                  {prov?.logo && <img src={prov.logo} alt="" className="pg-tab-logo" />}
                  <span>{mObj?.name || mId}</span>
                  {activeTabs.length > 1 && (
                    <span className="pg-tab-close" onClick={e => closeTab(e, i)}>
                      <X size={9} />
                    </span>
                  )}
                </button>
              );
            })}
            <button className="pg-tab-add" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={11} /> Add Model
            </button>
          </div>

          <div className="pg-topbar-right">
            <div className="pg-mode-pill">
              <button className={`pg-mode-btn ${!compareMode ? 'active' : ''}`} onClick={() => setCompareMode(false)}>Single</button>
              <button className={`pg-mode-btn ${compareMode ? 'active' : ''}`} onClick={() => setCompareMode(true)}>Compare</button>
            </div>
            {loading && (
              <button className="pg-dock-btn" onClick={stopAll} title="Stop" style={{ color: '#ef4444' }}>
                <X size={14} />
              </button>
            )}
            <button className={`pg-dock-btn ${showSettings ? '' : ''}`} onClick={() => setShowSettings(!showSettings)} title="Settings"
              style={showSettings ? { color: 'var(--primary)' } : {}}>
              <Settings2 size={15} />
            </button>
          </div>
        </div>

        {/* Chat viewport */}
        <div ref={scrollRef} className="pg-viewport">
          {messages.length === 0 && !error ? (
            <div className="pg-empty">
              <div className="pg-empty-spacer" />
            </div>
          ) : (
            <div className="pg-chat-wrap">
              {error && <div className="pg-error"><AlertCircle size={13} /> {error}</div>}
              {messages.map((m, i) => {
                if (m.role === 'user') {
                  return <div className="pg-msg-user" key={i}><div className="pg-msg-user-text">{m.content}</div></div>;
                }
                const toRender = compareMode ? Object.keys(m.responses || {}) : [activeTabs[activeTabIdx]];
                const isSingle = !compareMode || toRender.length === 1;
                return (
                  <div className={isSingle ? 'pg-msg-ai' : 'pg-compare-grid'} key={i}>
                    {toRender.map(mId => {
                      const mObj = models.find(x => x.id === mId);
                      const prov = PROVIDERS[mObj?.provider] || {};
                      const r = m.responses?.[mId] || { content: m.content, latency: 0, loading: false, error: null };
                      if (!r) return null;
                      return (
                        <div className={`pg-msg-card ${r.loading ? 'streaming' : ''}`} key={mId}>
                          <div className="pg-msg-head">
                            <div className="pg-msg-model">
                              {prov.logo && <img src={prov.logo} alt="" className="pg-msg-logo" />}
                              <span className="pg-msg-name">{mObj?.name || mId}</span>
                            </div>
                            {r.latency > 0 && <span className="pg-msg-latency">{(r.latency / 1000).toFixed(1)}s</span>}
                          </div>
                          {r.error === 'balance' ? (
                            <div className="pg-no-bal">
                              <div className="pg-no-bal-head"><AlertCircle size={13} /> Insufficient balance</div>
                              <p className="pg-no-bal-text">Add credits to continue using this model.</p>
                              <button className="pg-no-bal-btn" onClick={() => openPaymentModal()}>Add credits</button>
                            </div>
                          ) : r.error ? (
                            <div style={{ color: '#ef4444', fontSize: '0.78rem', padding: '0.4rem 0', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                              <AlertCircle size={13} style={{ marginTop: '2px', flexShrink: 0 }} /> <span>{r.error}</span>
                            </div>
                          ) : r.loading && !r.content ? (
                            <div className="pg-dots"><span /><span /><span /></div>
                          ) : (
                            <>
                              <div className="pg-msg-body">
                                <ReactMarkdown>{r.content}</ReactMarkdown>
                                {r.loading && <span className="pg-cursor" />}
                              </div>
                              {!r.loading && r.content && (
                                <div className="pg-msg-footer">
                                  <button className="pg-copy-btn" onClick={() => handleCopy(r.content)}><Copy size={11} /> Copy</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Suggestion chips + input dock */}
        <div className="pg-dock">
          <div className="pg-dock-inner">
            {messages.length === 0 && (
              <div className="pg-chips-row">
                {SUGGESTIONS.map((s, i) => (
                  <div key={i} className="pg-chip" onClick={() => setInput(s.title + ': ' + s.sub)}>
                    <div className="pg-chip-title">{s.title}</div>
                    <div className="pg-chip-sub">{s.sub}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="pg-dock-box">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Start a new message..."
                className="pg-dock-textarea"
                rows={1}
              />
              <div className="pg-dock-bar">
                <div className="pg-dock-left">
                  <button className="pg-dock-btn" title="Attach"><Paperclip size={14} /></button>
                  <div className="pg-dock-count">
                    <Layers size={10} />
                    <span>{activeModelsForQuery.length}</span>
                    <ChevronDown size={9} style={{ opacity: 0.5 }} />
                  </div>
                </div>
                <div className="pg-dock-right">
                  <button className="pg-send-btn" disabled={loading || !input.trim()} onClick={handleSend}>
                    {loading ? <RefreshCw size={13} className="animate-spin" /> : <ArrowUp size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ C. SETTINGS DRAWER ═══ */}
      {showSettings && (
        <aside className="pg-drawer">
          <div className="pg-drawer-head">
            <span className="pg-drawer-title">Settings</span>
            <button className="pg-drawer-x" onClick={() => setShowSettings(false)}><X size={13} /></button>
          </div>
          <div className="pg-drawer-body">
            <div>
              <span className="pg-drawer-label">System Prompt</span>
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="Custom instructions..." className="pg-drawer-ta" />
            </div>
            <div>
              <span className="pg-drawer-label">Parameters</span>
              <div className="pg-slider-group">
                <div className="pg-slider-row"><span>Temperature</span><span className="pg-slider-val">{temperature}</span></div>
                <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="pg-slider-input" />
              </div>
              <div className="pg-slider-group">
                <div className="pg-slider-row"><span>Max Tokens</span><span className="pg-slider-val">{maxTokens}</span></div>
                <input type="range" min="256" max="8192" step="256" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} className="pg-slider-input" />
              </div>
              <div className="pg-slider-group">
                <div className="pg-slider-row"><span>Top P</span><span className="pg-slider-val">{topP}</span></div>
                <input type="range" min="0" max="1" step="0.05" value={topP} onChange={e => setTopP(parseFloat(e.target.value))} className="pg-slider-input" />
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <span className="pg-drawer-label">Active Models</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {activeTabs.map((mId, idx) => {
                  const mObj = models.find(m => m.id === mId);
                  const prov = PROVIDERS[mObj?.provider];
                  return (
                    <div key={mId} onClick={() => setActiveTabIdx(idx)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.35rem 0.5rem', borderRadius: '7px', cursor: 'pointer',
                      background: idx === activeTabIdx ? 'var(--primary-soft)' : 'var(--surface)',
                      border: `1px solid ${idx === activeTabIdx ? 'var(--primary-glow)' : 'var(--border-light)'}`,
                      fontSize: '0.75rem', fontWeight: 600
                    }}>
                      {prov?.logo && <img src={prov.logo} alt="" style={{ width: '13px', height: '13px', borderRadius: '3px', objectFit: 'contain' }} />}
                      <span style={{ flex: 1 }}>{mObj?.name || mId}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={startNewConversation} style={{
              width: '100%', padding: '0.45rem', marginTop: '1rem',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '7px', color: 'var(--text)', fontSize: '0.75rem',
              fontWeight: 650, cursor: 'pointer'
            }}>
              Clear conversation
            </button>
          </div>
        </aside>
      )}

      {/* ═══ D. ADD MODEL MODAL ═══ */}
      {isAddModalOpen && (
        <div className="pg-modal-bg" onClick={() => setIsAddModalOpen(false)}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <div className="pg-modal-top">
              <span className="pg-modal-t">Select Model</span>
              <button className="pg-modal-x" onClick={() => setIsAddModalOpen(false)}><X size={13} /></button>
            </div>
            <div className="pg-modal-body">
              <div className="pg-modal-search">
                <Search size={12} className="pg-modal-search-i" />
                <input type="text" placeholder="Search models..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pg-modal-search-in" autoFocus />
              </div>
              <div className="pg-modal-filters">
                {['All','Chat','Image','Video','Code','Voice','Music','Embedding','3D','OCR'].map(c => (
                  <button key={c} className={`pg-filter ${filterType === c ? 'on' : ''}`} onClick={() => setFilterType(c)}>{c}</button>
                ))}
              </div>
              {Object.entries(modelsByProvider).map(([prov, ms]) => (
                <div key={prov}>
                  <div className="pg-prov-label">{prov}</div>
                  <div className="pg-m-grid">
                    {ms.map(model => {
                      const open = activeTabs.includes(model.id);
                      return (
                        <div key={model.id} className="pg-m-item" onClick={() => addModelTab(model.id)}>
                          <span className="pg-m-name">{model.name}</span>
                          <span className="pg-m-badge" style={{ color: open ? '#10b981' : 'var(--text-muted)' }}>
                            {open ? 'Active' : '+ Add'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ E. TOAST ═══ */}
      {copiedText && <div className="pg-toast"><Check size={12} style={{ color: '#10b981' }} /> Copied to clipboard</div>}
    </div>
  );
}
