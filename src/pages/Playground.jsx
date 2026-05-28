import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Send, Trash2, Cpu, Sparkles, AlertCircle, Copy, RefreshCw, X, 
  ChevronRight, ChevronDown, Star, Sliders, ArrowUpRight, Check,
  MessageSquare, Plus, Settings2, Code, Video, Image as ImageIcon,
  Mic, Paperclip, HelpCircle, Layers, Activity, Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';
import { getDynamicModels, PROVIDERS } from '../data/models';
import { safeFetch } from '../lib/safeFetch';
import Sidebar from '../components/Sidebar';

// Sanitize provider errors into clear neural status messages
const sanitizeProviderError = (msg) => {
  if (!msg) return 'Erro desconhecido na rede neural.';
  if (msg instanceof Error) return sanitizeProviderError(msg.message);

  const msgStr = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);

  // Detect Chinese characters or SiliconFlow / DeepSeek garbage output
  const hasChinese       = /[\u4e00-\u9fa5]/.test(msgStr);
  const isInvalidToken   = msgStr.includes('无效的令牌')
    || /invalid\s+token|unauthorized|invalid\s+api\s+key|invalid_token/i.test(msgStr);
  const isUserOutOfBalance = /insufficient balance|payment required/i.test(msgStr);
  const isChannelOutOfBalance = /quota|insufficient_funds|out of balance/i.test(msgStr);

  if (hasChinese || isInvalidToken) {
    return 'Erro de Sincronização Neural: O provedor upstream está com credenciais inválidas ou temporariamente indisponível.';
  }

  if (isUserOutOfBalance) {
    return 'Saldo Insuficiente: A sua conta não dispõe de créditos suficientes para esta operação. Por favor, adicione fundos no Dashboard.';
  }

  if (isChannelOutOfBalance) {
    return 'Erro de Créditos do Canal: O canal de processamento upstream esgotou a sua cota. Por favor, tente um modelo alternativo.';
  }
  if (msgStr.includes('Failed to fetch') || msgStr.includes('NetworkError') || msgStr.includes('Network request failed')) {
    return 'Falha na Ligação: Não foi possível conectar ao núcleo neural. Verifique a sua internet.';
  }
  return msgStr;
};

export default function Playground() {
  const { user, refreshUser, isProfileLoading } = useAuth();
  const { openPaymentModal } = usePayment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlModel = searchParams.get('model');

  // Multi-Model Workspace State
  const [activeTabs, setActiveTabs] = useState(['gpt-4o-mini']);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [compareMode, setCompareMode] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Chat and inference state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Search & Filter state for the Add Model Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  // System states
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [models, setModels] = useState([]);
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  // Copy alerts
  const [copiedId, setCopiedId] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  const abortControllersRef = useRef({});
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Fetch Dynamic Models & Set Initial Tab
  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data ?? []);
      setIsModelsLoading(false);
      
      // If a model is passed in the URL, make it the active workspace tab
      if (urlModel && data?.some(m => m.id === urlModel)) {
        setActiveTabs([urlModel]);
        setActiveTabIdx(0);
      } else if (data?.length > 0) {
        // Default selection matching screenshot
        const defaultModels = ['gpt-4o', 'claude-3-5-sonnet', 'grok-beta', 'qwen-2.5-72b-instruct'].filter(id => data.some(m => m.id === id));
        if (defaultModels.length > 0) {
          setActiveTabs(defaultModels);
        } else {
          setActiveTabs([data[0].id]);
        }
        setActiveTabIdx(0);
      }
    }).catch(err => {
      console.error('Failed to load models:', err);
      setIsModelsLoading(false);
    });
  }, [urlModel]);

  // Expand tabs automatically if CompareMode changes
  const activeModelsForQuery = useMemo(() => {
    return compareMode ? activeTabs : [activeTabs[activeTabIdx]];
  }, [compareMode, activeTabs, activeTabIdx]);

  // Scroll chat bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch past conversations
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
    setError(null);
  };

  const loadConversation = (conv) => {
    setMessages(conv.messages || []);
    setCurrentConvId(conv.id);
    if (conv.model_id) {
      // Split list if it was a saved array, or load single
      try {
        const loadedIds = JSON.parse(conv.model_id);
        if (Array.isArray(loadedIds) && loadedIds.length > 0) {
          setActiveTabs(loadedIds);
          setActiveTabIdx(0);
        } else {
          setActiveTabs([conv.model_id]);
          setActiveTabIdx(0);
        }
      } catch (e) {
        setActiveTabs([conv.model_id]);
        setActiveTabIdx(0);
      }
    }
    setError(null);
  };

  const saveConversation = async (updatedMessages, openModelIds) => {
    if (!user || updatedMessages.length === 0) return;
    setIsSaving(true);
    try {
      const title = updatedMessages[0].content.substring(0, 45) + (updatedMessages[0].content.length > 45 ? '...' : '');
      const modelIdString = JSON.stringify(openModelIds);

      if (currentConvId) {
        const { error } = await supabase
          .from('conversations')
          .update({ 
            messages: updatedMessages, 
            model_id: modelIdString,
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
            model_id: modelIdString,
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

  // 2. Parallel Streaming Message Dispatcher
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!user) {
      setError('Sessão expirada. Inicie sessão para continuar.');
      return;
    }

    const hasNoCredits = !user.isAdmin && (!user.balance || user.balance <= 0.001);

    // A. Add User Message
    const userMessage = { role: 'user', content: input, timestamp: Date.now() };
    
    // B. Build Assistant Placeholder structured for parallel model responses
    const assistantPlaceholder = {
      role: 'assistant',
      compare: true,
      responses: activeModelsForQuery.reduce((acc, mId) => {
        acc[mId] = {
          content: '',
          latency: 0,
          loading: !hasNoCredits, // If zero balance, loading is false instantly
          error: hasNoCredits ? 'balance' : null
        };
        return acc;
      }, {})
    };

    const nextMessages = [...messages, userMessage, assistantPlaceholder];
    setMessages(nextMessages);
    setInput('');
    setError(null);

    // If balance is depleted, trigger top up modal and don't query API
    if (hasNoCredits) {
      setError('Saldo Insuficiente: A sua conta não dispõe de créditos suficientes para esta operação. Por favor, adicione fundos.');
      openPaymentModal();
      return;
    }

    setLoading(true);

    // Helper state updates
    const updateResponse = (modelId, updateFn) => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant' && last.responses && last.responses[modelId]) {
          last.responses = {
            ...last.responses,
            [modelId]: updateFn(last.responses[modelId])
          };
        }
        return next;
      });
    };

    // Parallel execution pool
    const runInference = async (mId) => {
      const startTime = Date.now();
      const controller = new AbortController();
      abortControllersRef.current[mId] = controller;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiKey = user.apiKeys?.[0]?.key;
        const mObj = models.find(m => m.id === mId);
        
        const requestHeaders = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          requestHeaders['Authorization'] = `Bearer ${session.access_token}`;
        } else if (apiKey) {
          requestHeaders['x-api-key'] = apiKey;
        }

        const isMedia = ['Image', 'Video', 'Audio'].includes(mObj?.type);
        const sysContext = systemPrompt || "You are Digitaland AI, a secure frontier multi-model gateway API. Be precise.";

        // Prepares chat payload cleanly
        const payloadMessages = [
          { role: 'system', content: sysContext },
          ...messages.filter(m => m.role === 'user' || (m.role === 'assistant' && !m.compare)).map(m => ({ role: m.role, content: m.content })),
          // Add the current user prompt
          { role: 'user', content: userMessage.content }
        ];

        const response = await safeFetch('/v1/chat/completions', {
          method: 'POST',
          headers: requestHeaders,
          signal: controller.signal,
          body: JSON.stringify({
            model: mId,
            messages: payloadMessages,
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            stream: !isMedia
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gateway returned error code ${response.status}`);
        }

        let accumulatedText = '';

        if (isMedia) {
          const mediaData = await response.json();
          accumulatedText = mediaData.data?.[0]?.url || mediaData.choices?.[0]?.message?.content || '';
          if (accumulatedText.startsWith('http')) {
            const wrap = mObj?.type === 'Image' ? '!' : '';
            accumulatedText = `${wrap}[Neural Output](${accumulatedText})`;
          }
          updateResponse(mId, prev => ({
            ...prev,
            content: accumulatedText,
            loading: false,
            latency: Date.now() - startTime
          }));
        } else {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let lineBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lineBuffer += decoder.decode(value, { stream: true });
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;

              if (trimmed.startsWith('data: ')) {
                try {
                  const dataObj = JSON.parse(trimmed.slice(6));
                  const textDelta = dataObj.choices?.[0]?.delta?.content || '';
                  if (textDelta) {
                    accumulatedText += textDelta;
                    updateResponse(mId, prev => ({
                      ...prev,
                      content: accumulatedText
                    }));
                  }
                } catch (e) {
                  // Buffer fragments safely
                }
              }
            }
          }

          updateResponse(mId, prev => ({
            ...prev,
            loading: false,
            latency: Date.now() - startTime
          }));
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          updateResponse(mId, prev => ({
            ...prev,
            loading: false,
            error: sanitizeProviderError(err.message)
          }));
        }
      }
    };

    // Trigger all queries simultaneously!
    await Promise.all(activeModelsForQuery.map(mId => runInference(mId)));
    
    setLoading(false);
    await saveConversation(nextMessages, activeModelsForQuery);
    if (refreshUser) await refreshUser();
  };

  const stopAllGenerations = () => {
    Object.keys(abortControllersRef.current).forEach(mId => {
      if (abortControllersRef.current[mId]) {
        abortControllersRef.current[mId].abort();
      }
    });
    setLoading(false);
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1500);
  };

  // Filtered model results for adding tabs
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (!m) return false;
      const q = searchQuery ? searchQuery.toLowerCase() : '';
      const nameLower = (m.name || '').toLowerCase();
      const providerLower = (m.provider || '').toLowerCase();
      const matchSearch = !q || nameLower.includes(q) || providerLower.includes(q);
      
      if (filterType === 'All') return matchSearch;
      return m.type === filterType && matchSearch;
    });
  }, [models, searchQuery, filterType]);

  // Group models by provider for add modal
  const modelsByProvider = useMemo(() => {
    const grouped = {};
    filteredModels.forEach(m => {
      if (!m) return;
      const provider = m.provider || 'Other';
      if (!grouped[provider]) grouped[provider] = [];
      grouped[provider].push(m);
    });
    return grouped;
  }, [filteredModels]);

  const addModelTab = (modelId) => {
    if (!activeTabs.includes(modelId)) {
      setActiveTabs([...activeTabs, modelId]);
      setActiveTabIdx(activeTabs.length);
    } else {
      const idx = activeTabs.indexOf(modelId);
      setActiveTabIdx(idx);
    }
    setIsAddModalOpen(false);
  };

  const closeModelTab = (e, index) => {
    e.stopPropagation();
    if (activeTabs.length <= 1) return; // Keep at least one

    const newTabs = activeTabs.filter((_, i) => i !== index);
    setActiveTabs(newTabs);

    if (activeTabIdx >= newTabs.length) {
      setActiveTabIdx(newTabs.length - 1);
    }
  };

  // Dynamic values based on active tab selection
  const currentModel = models.find(m => m.id === activeTabs[activeTabIdx]) || models[0];

  return (
    <div className="playground-studio-root">
      <style>{`
        .playground-studio-root {
          display: flex;
          width: 100vw;
          height: calc(100vh - 68px);
          background: var(--bg);
          position: absolute;
          left: 0;
          top: 68px;
          overflow: hidden;
          z-index: 100;
          font-family: 'Inter', sans-serif;
          color: var(--text);
        }

        .playground-studio-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-alt);
          position: relative;
          overflow: hidden;
        }

        /* Top tabs bar */
        .playground-tabs-bar {
          display: flex;
          align-items: center;
          background: var(--bg);
          border-bottom: 1px solid var(--border-light);
          padding: 0.5rem 1rem 0;
          gap: 0.35rem;
          overflow-x: auto;
          scrollbar-width: none;
          min-height: 48px;
          z-index: 90;
        }
        .playground-tabs-bar::-webkit-scrollbar {
          display: none;
        }

        .playground-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 1rem;
          background: transparent;
          border: 1px solid transparent;
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          position: relative;
          top: 1px;
        }
        .playground-tab:hover {
          color: var(--text);
          background: rgba(0,0,0,0.02);
        }
        .playground-tab.active {
          background: var(--bg-alt);
          border-color: var(--border-light);
          color: var(--text);
          font-weight: 700;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.01);
        }
        [data-theme="dark"] .playground-tab.active {
          background: var(--bg-alt);
          border-color: var(--border);
        }

        .playground-tab-logo {
          width: 15px;
          height: 15px;
          object-fit: contain;
          border-radius: 3px;
        }

        .playground-tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          color: var(--text-muted);
          opacity: 0.5;
          transition: all 0.2s;
        }
        .playground-tab-close:hover {
          background: var(--border-light);
          opacity: 1;
          color: var(--text);
        }

        .playground-tab-add {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          border: 1px dashed var(--border);
          background: transparent;
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 0.5rem;
          position: relative;
          bottom: 2px;
        }
        .playground-tab-add:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-soft);
        }

        /* Top controls status bar */
        .studio-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 2rem;
          border-bottom: 1px solid var(--border-light);
          z-index: 80;
          background: var(--bg-alt);
        }

        .compare-toggle-container {
          display: flex;
          background: var(--bg);
          border: 1px solid var(--border-light);
          padding: 2px;
          border-radius: 100px;
        }
        .compare-toggle-btn {
          font-size: 0.72rem;
          font-weight: 750;
          padding: 0.35rem 0.85rem;
          border-radius: 100px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .compare-toggle-btn.active {
          background: var(--bg-alt);
          color: var(--text);
          box-shadow: var(--shadow-xs);
        }

        /* Chat stream viewport */
        .studio-viewport {
          flex: 1;
          width: 100%;
          overflow-y: auto;
          padding: 2rem;
          scrollbar-width: none;
          scroll-behavior: smooth;
        }
        .studio-viewport::-webkit-scrollbar {
          display: none;
        }

        .studio-welcome-wrap {
          max-width: 680px;
          margin: 4rem auto;
          text-align: center;
        }
        .studio-welcome-logo {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: var(--bg);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: var(--shadow-md);
        }

        /* Message bubbles */
        .chat-row-user {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-bottom: 2rem;
          width: 100%;
        }
        .chat-bubble-user {
          max-width: 70%;
          background: #0f172a;
          color: #ffffff;
          padding: 0.9rem 1.4rem;
          border-radius: 18px 18px 4px 18px;
          font-size: 0.95rem;
          line-height: 1.55;
          box-shadow: var(--shadow-sm);
        }
        [data-theme="dark"] .chat-bubble-user {
          background: #f8fafc;
          color: #0f172a;
        }

        /* Parallel comparison response box */
        .chat-row-assistant-compare {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
          width: 100%;
          align-items: start;
        }
        .chat-row-assistant-compare.single-active {
          grid-template-columns: 1fr;
        }

        .comparison-response-card {
          background: var(--bg-alt);
          border: 1.5px solid var(--border-light);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
          min-height: 140px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.25s ease;
        }
        .comparison-response-card.loading {
          border-color: var(--primary-soft);
          background: rgba(var(--primary), 0.01);
        }
        .comparison-response-card.active-tab {
          border-color: var(--text);
          box-shadow: var(--shadow-md);
        }

        .card-model-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
        }
        .card-model-info {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .card-model-logo {
          width: 20px;
          height: 20px;
          object-fit: contain;
          border-radius: 4px;
        }
        .card-model-name {
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          font-weight: 750;
        }
        .card-model-latency {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          background: var(--bg);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Insufficient balance styling */
        .insufficient-balance-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 1rem 0;
          border-radius: 10px;
          width: 100%;
        }
        .ib-card-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: #ef4444;
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: 0.4rem;
        }
        .ib-card-text {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .ib-card-btn {
          padding: 0.45rem 1rem;
          background: #0f172a;
          color: #ffffff;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .ib-card-btn:hover {
          opacity: 0.9;
        }
        [data-theme="dark"] .ib-card-btn {
          background: #f8fafc;
          color: #0f172a;
        }

        /* Bottom chat input bar */
        .studio-dock-container {
          width: 100%;
          padding: 0 2rem 2rem;
          background: transparent;
          position: relative;
          z-index: 80;
        }
        .studio-dock-box {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-md);
          padding: 0.6rem 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .studio-dock-textarea {
          width: 100%;
          background: transparent;
          border: none;
          resize: none;
          min-height: 48px;
          max-height: 200px;
          color: var(--text);
          font-size: 0.95rem;
          line-height: 1.5;
          outline: none;
          font-family: inherit;
        }
        .studio-dock-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border-light);
          padding-top: 0.5rem;
        }
        .dock-left-tools {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .dock-tool-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dock-tool-btn:hover {
          background: var(--bg);
          color: var(--text);
        }

        .dock-active-count {
          font-size: 0.72rem;
          font-weight: 750;
          color: var(--primary);
          background: var(--primary-soft);
          border: 1px solid var(--primary-glow);
          padding: 2px 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .dock-send-btn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--primary);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dock-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          background: var(--primary-hover);
        }
        .dock-send-btn:disabled {
          background: var(--border);
          color: var(--text-muted);
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Slide config panel */
        .studio-settings-drawer {
          width: 300px;
          border-left: 1px solid var(--border-light);
          background: var(--bg);
          height: 100%;
          display: flex;
          flex-direction: column;
          z-index: 100;
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-section {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }
        .drawer-label {
          font-size: 0.7rem;
          font-weight: 900;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.75rem;
          display: block;
        }

        .range-slider-wrap {
          margin-bottom: 1.25rem;
        }
        .range-slider-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 650;
          margin-bottom: 0.4rem;
        }

        /* Add model modal */
        .studio-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .studio-modal-card {
          width: 90%;
          max-width: 640px;
          height: 80vh;
          background: var(--bg-alt);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalScaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .modal-search-wrap {
          position: relative;
          width: 100%;
          margin-bottom: 1.25rem;
        }
        .modal-search-input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          color: var(--text);
          font-size: 0.9rem;
          outline: none;
        }

        .modal-filters {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          scrollbar-width: none;
          margin-bottom: 1.5rem;
        }
        .modal-filters::-webkit-scrollbar {
          display: none;
        }
        .modal-filter-btn {
          padding: 0.35rem 0.85rem;
          border-radius: 100px;
          background: var(--bg);
          border: 1px solid var(--border-light);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          color: var(--text-dim);
        }
        .modal-filter-btn.active {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
        }

        .provider-section-title {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.75rem;
        }
        .modal-model-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 580px) {
          .modal-model-grid {
            grid-template-columns: 1fr;
          }
        }
        .modal-model-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1.5px solid var(--border-light);
          background: var(--bg-alt);
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-model-item:hover {
          border-color: var(--primary);
          background: var(--primary-soft);
        }

        .copy-toast-premium {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #0f172a;
          color: #ffffff;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.85rem;
          font-weight: 550;
          z-index: 9999;
          animation: slide-up-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-theme="dark"] .copy-toast-premium {
          background: #ffffff;
          color: #0f172a;
        }
      `}</style>

      {/* A. Integrated Left Platform Sidebar */}
      <Sidebar />

      {/* B. Main Studio Workspace */}
      <div className="playground-studio-main">
        {/* Model tab manager */}
        <div className="playground-tabs-bar">
          {activeTabs.map((mId, index) => {
            const mObj = models.find(m => m.id === mId);
            const prov = PROVIDERS[mObj?.provider];
            const isActive = activeTabIdx === index;
            return (
              <div
                key={mId + '-' + index}
                className={`playground-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTabIdx(index)}
              >
                {prov?.logo && (
                  <img src={prov.logo} alt="" className="playground-tab-logo" />
                )}
                <span>{mObj?.name || mId}</span>
                {activeTabs.length > 1 && (
                  <button
                    className="playground-tab-close"
                    onClick={(e) => closeModelTab(e, index)}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            className="playground-tab-add"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={12} /> Add Model
          </button>
        </div>

        {/* Studio controls status bar */}
        <div className="studio-status-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'transparent',
                border: 'none',
                color: showSettings ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Tuning Settings"
            >
              <Settings2 size={18} />
            </button>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Digitaland Secure Core
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Compare mode toggler */}
            <div className="compare-toggle-container">
              <button
                className={`compare-toggle-btn ${compareMode ? 'active' : ''}`}
                onClick={() => setCompareMode(true)}
              >
                Compare
              </button>
              <button
                className={`compare-toggle-btn ${!compareMode ? 'active' : ''}`}
                onClick={() => setCompareMode(false)}
              >
                Single
              </button>
            </div>
            
            {loading && (
              <button
                onClick={stopAllGenerations}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: '0.72rem',
                  fontWeight: 750,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '100px',
                  cursor: 'pointer'
                }}
              >
                Cancel Inference
              </button>
            )}
          </div>
        </div>

        {/* Viewport for chat streams */}
        <div ref={scrollRef} className="studio-viewport">
          {messages.length === 0 && !error && (
            <div className="studio-welcome-wrap">
              <div className="studio-welcome-logo">
                <Sparkles size={36} style={{ color: 'var(--primary)' }} />
              </div>
              <h1 style={{ fontFamily: 'Outfit', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.75rem' }}>
                Digitaland Studio
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '2.5rem' }}>
                Compare frontier models in parallel. Zero-logging security, guaranteed 30% savings.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  'Gere um resumo comparativo de PostgreSQL vs MySQL para alta carga',
                  'Escreva uma função otimizada em Javascript para busca binária recursiva',
                  'Explique redes neurais convolucionais em 3 parágrafos simples',
                  'Esboce um slogan de marketing inovador para a Digitaland.ai'
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(txt)}
                    style={{
                      background: 'var(--bg-alt)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '14px',
                      padding: '1rem',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', color: '#ef4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '680px', margin: '0 auto 1.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div className="chat-row-user" key={i}>
                    <div className="chat-bubble-user">{m.content}</div>
                  </div>
                );
              }

              // Assistant multi-response renderer
              const activeModelsToRender = compareMode ? Object.keys(m.responses || {}) : [activeTabs[activeTabIdx]];
              return (
                <div
                  className={`chat-row-assistant-compare ${!compareMode ? 'single-active' : ''}`}
                  key={i}
                >
                  {activeModelsToRender.map(mId => {
                    const mObj = models.find(mod => mod.id === mId);
                    const prov = PROVIDERS[mObj?.provider] || { color: 'var(--primary)', short: 'AI' };
                    const isTabActive = activeTabs[activeTabIdx] === mId;

                    // Backwards compatible value check
                    const resObj = m.responses ? m.responses[mId] : { content: m.content, latency: 0, loading: false, error: null };
                    if (!resObj) return null;

                    return (
                      <div
                        className={`comparison-response-card ${resObj.loading ? 'loading' : ''} ${isTabActive ? 'active-tab' : ''}`}
                        key={mId}
                      >
                        <div className="card-model-header">
                          <div className="card-model-info">
                            {prov.logo && (
                              <img src={prov.logo} alt="" className="card-model-logo" />
                            )}
                            <span className="card-model-name">{mObj?.name || mId}</span>
                          </div>
                          {resObj.latency > 0 && (
                            <span className="card-model-latency">{resObj.latency}ms</span>
                          )}
                        </div>

                        {resObj.error === 'balance' ? (
                          <div className="insufficient-balance-card">
                            <div className="ib-card-header">
                              <AlertCircle size={15} />
                              <span>Insufficient balance</span>
                            </div>
                            <p className="ib-card-text">
                              You've run out of funds. Please top up your balance or update your payment method to continue.
                            </p>
                            <button className="ib-card-btn" onClick={() => openPaymentModal()}>
                              Top up
                            </button>
                          </div>
                        ) : resObj.error ? (
                          <div style={{ color: '#ef4444', fontSize: '0.8rem', padding: '0.5rem 0' }}>
                            <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                            {resObj.error}
                          </div>
                        ) : resObj.loading && !resObj.content ? (
                          <div style={{ padding: '1rem 0', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Streaming</span>
                            <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--primary)' }} />
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div className="prose" style={{ fontSize: '0.9rem', lineHeight: '1.6', overflow: 'hidden' }}>
                              <ReactMarkdown>{resObj.content}</ReactMarkdown>
                              {resObj.loading && <span className="pulse" style={{ color: 'var(--primary)', fontWeight: 800 }}>▋</span>}
                            </div>
                            
                            {!resObj.loading && resObj.content && (
                              <div style={{ marginTop: '1rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem' }}>
                                <button
                                  className="dock-tool-btn"
                                  onClick={() => handleCopyText(resObj.content)}
                                  title="Copy text"
                                  style={{ width: 'auto', padding: '0 4px', fontSize: '0.65rem', fontWeight: 800 }}
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Input dock */}
        <div className="studio-dock-container">
          <div className="studio-dock-box">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Send message to ${compareMode ? activeModelsForQuery.length + ' active models' : currentModel?.name}...`}
              className="studio-dock-textarea"
            />

            <div className="studio-dock-actions">
              <div className="dock-left-tools">
                <button className="dock-tool-btn" title="Upload Attachment">
                  <Paperclip size={15} />
                </button>
                <button className="dock-tool-btn" title="Voice Input">
                  <Mic size={15} />
                </button>
                
                <div className="dock-active-count">
                  <Cpu size={12} />
                  <span>{activeModelsForQuery.length} open</span>
                </div>
              </div>

              <button
                className="dock-send-btn"
                disabled={loading || !input.trim()}
                onClick={handleSend}
              >
                {loading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Digitaland Studio v6.0 • Multi-Model Parallel inference gateway
          </div>
        </div>
      </div>

      {/* C. Collapsible Tuning Drawer */}
      {showSettings && (
        <aside className="studio-settings-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tuning Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background: 'var(--bg)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="drawer-section">
              <span className="drawer-label">System Context</span>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Give instructions to target core..."
                style={{ width: '100%', height: '140px', background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '0.75rem', fontSize: '0.82rem', outline: 'none', resize: 'none', color: 'var(--text)' }}
              />
            </div>

            <div className="drawer-section">
              <span className="drawer-label">Hyperparameters</span>
              
              <div className="range-slider-wrap">
                <div className="range-slider-header">
                  <span>Creativity (Temp)</span>
                  <span style={{ color: 'var(--primary)' }}>{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', accentColor: 'var(--primary)' }}
                />
              </div>

              <div className="range-slider-wrap">
                <div className="range-slider-header">
                  <span>Response Depth</span>
                  <span style={{ color: 'var(--primary)' }}>{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={maxTokens}
                  onChange={e => setMaxTokens(parseInt(e.target.value))}
                  style={{ width: '100%', height: '4px', accentColor: 'var(--primary)' }}
                />
              </div>

              <div className="range-slider-wrap">
                <div className="range-slider-header">
                  <span>Probability (Top P)</span>
                  <span style={{ color: 'var(--primary)' }}>{topP}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={e => setTopP(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>

            <div className="drawer-section" style={{ borderBottom: 'none' }}>
              <span className="drawer-label">Active Model Vault</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={startNewConversation}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  New Chat Session
                </button>
                {conversations.slice(0, 5).map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: currentConvId === conv.id ? 'var(--primary-soft)' : 'transparent', border: '1px solid', borderColor: currentConvId === conv.id ? 'var(--primary-glow)' : 'transparent', textAlign: 'left', transition: '0.2s', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: currentConvId === conv.id ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{new Date(conv.updated_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* D. Add Model Search Modal */}
      {isAddModalOpen && (
        <div className="studio-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="studio-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 800 }}>Search Models Matrix</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'var(--bg)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--text-muted)' }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="modal-body">
              {/* Search */}
              <div className="modal-search-wrap">
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input
                  type="text"
                  placeholder="Search model names or brands..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="modal-search-input"
                />
              </div>

              {/* Categories */}
              <div className="modal-filters">
                {['All', 'Chat', 'Image', 'Video', 'Code', 'Voice', 'Music', 'Embedding', '3D', 'OCR'].map(cat => (
                  <button
                    key={cat}
                    className={`modal-filter-btn ${filterType === cat ? 'active' : ''}`}
                    onClick={() => setFilterType(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Model Grid grouped by provider */}
              {Object.entries(modelsByProvider).map(([provider, pModels]) => (
                <div key={provider} style={{ marginBottom: '1.5rem' }}>
                  <div className="provider-section-title">{provider}</div>
                  <div className="modal-model-grid">
                    {pModels.map(model => {
                      const isAlreadyOpen = activeTabs.includes(model.id);
                      return (
                        <div
                          key={model.id}
                          className="modal-model-item"
                          onClick={() => addModelTab(model.id)}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--text)' }}>
                            {model.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                            {isAlreadyOpen ? (
                              <span style={{ color: '#10b981' }}>Added</span>
                            ) : (
                              <span>+ Add</span>
                            )}
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

      {/* E. Copy Alert Notification Toast */}
      {copiedText && (
        <div className="copy-toast-premium">
          <Check size={14} style={{ color: '#10b981' }} />
          <span>Response copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
