import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SupportChat() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState('offline'); // 'active', 'away', 'offline'
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sessionId, setSessionId] = useState('');

  const messagesEndRef = useRef(null);
  const chatChannelRef = useRef(null);

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // 1. Initialise Authenticated Session ID from logged-in user & handle state cleanups on logout
  useEffect(() => {
    if (user?.id) {
      setSessionId(user.id);
    } else {
      setSessionId('');
      setChat(null);
      setMessages([]);
    }
  }, [user]);

  // 2. Fetch and Subscribe to Agent Status
  useEffect(() => {
    async function loadStatus() {
      try {
        const { data, error } = await supabase
          .from('support_agent_status')
          .select('status')
          .eq('id', 'main_agent')
          .maybeSingle();
        if (!error && data) {
          setAgentStatus(data.status);
        }
      } catch (err) {
        console.warn('Could not load status:', err);
      }
    }
    loadStatus();

    const channel = supabase
      .channel('agent_status_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_agent_status' }, payload => {
        if (payload.new && payload.new.status) {
          setAgentStatus(payload.new.status);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // 3. Load Active Chat Session and Complete Conversation History for Guest
  useEffect(() => {
    if (!sessionId) return;

    async function loadChatAndHistory() {
      try {
        // Query all chat sessions for this guest_session_id ordered by created_at desc
        const { data: chats, error: chatsErr } = await supabase
          .from('support_chats')
          .select('*')
          .eq('guest_session_id', sessionId)
          .order('created_at', { ascending: false });

        if (chatsErr) throw chatsErr;

        // Find the active open chat (if any)
        const activeOpenChat = chats?.find(c => c.status === 'open');
        setChat(activeOpenChat || null);

        // Fetch all messages belonging to ANY of the chats for this guest
        if (chats && chats.length > 0) {
          const chatIds = chats.map(c => c.id);
          const { data: msgs, error: msgsErr } = await supabase
            .from('support_messages')
            .select('*')
            .in('chat_id', chatIds)
            .order('id', { ascending: true });

          if (msgsErr) throw msgsErr;
          if (msgs) setMessages(msgs);
        } else {
          // If no chats exist at all, show the friendly welcome message
          setMessages([
            { id: 'welcome', sender_role: 'system', content: 'Olá! Sou o assistente inteligente da Digitaland. Como posso ajudar-te hoje?', created_at: new Date().toISOString() }
          ]);
        }
      } catch (err) {
        console.warn('Could not load chat and history:', err);
      }
    }
    loadChatAndHistory();
  }, [sessionId]);

  // WhatsApp-style gentle chime synth sound
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 (587.33Hz)
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5 (880.00Hz)
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Web Audio chime blocked/failed:', e);
    }
  };

  // 4. Subscribe to Live Support Messages & Parent Chat Session Status Updates when Chat ID is set (Stably tracks chat.id)
  useEffect(() => {
    if (!chat?.id) return;

    if (chatChannelRef.current) chatChannelRef.current.unsubscribe();

    const channel = supabase
      .channel(`support_chat:${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, payload => {
        if (payload.new && payload.new.chat_id === chat.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            
            // Play notification sound on incoming agent messages
            if (payload.new.sender_role === 'agent') {
              playNotificationSound();
            }
            
            return [...prev.filter(m => m.id !== 'temp-' + payload.new.id), payload.new];
          });

          // Trigger unread indicator if closed
          if (!isOpenRef.current) {
            setUnread(u => u + 1);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_chats', filter: `id=eq.${chat.id}` }, payload => {
        if (payload.new && payload.new.id === chat.id) {
          setChat(payload.new);
        }
      })
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [chat?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setUnread(0);
  };

  // 5. Send Message Handler (Optimistic WhatsApp Style Updates)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const guestMessageText = input.trim();
    setInput('');

    // Instant Optimistic Update
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      chat_id: chat?.id || 'pending',
      sender_role: 'guest',
      content: guestMessageText,
      created_at: new Date().toISOString(),
      status: 'sending' // 'sending' (clock icon), 'sent' (double check)
    };

    setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), tempMsg]);

    let activeChat = chat;

    // 5a. Create Support Chat session in database if it doesn't exist yet
    if (!activeChat) {
      try {
        const { data: newChat, error } = await supabase
          .from('support_chats')
          .insert([{ 
            guest_session_id: sessionId || user.id, 
            guest_name: user?.email || 'User ' + (sessionId || user.id).slice(-4) 
          }])
          .select()
          .single();

        if (error) throw error;
        activeChat = newChat;
        setChat(newChat);
      } catch (err) {
        console.error('Failed to create support chat session:', err);
        // Mark optimistic message as failed
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        return;
      }
    }

    // 5b. Insert Guest Message
    try {
      const { data: newMsg, error } = await supabase
        .from('support_messages')
        .insert([{
          chat_id: activeChat.id,
          sender_role: 'guest',
          content: guestMessageText
        }])
        .select()
        .single();
      if (error) throw error;

      // Replace the optimistic message with the database message
      setMessages(prev => prev.map(m => m.id === tempId ? { ...newMsg, status: 'sent' } : m));

      // Trigger realtime update in support_chats parent row, reopening if closed, so Admin panel receives this message instantly!
      await supabase
        .from('support_chats')
        .update({ 
          status: 'open',
          updated_at: new Date().toISOString() 
        })
        .eq('id', activeChat.id);

      // 5c. Run AI Support bot if status is Offline or Away
      if (agentStatus === 'offline' || agentStatus === 'away') {
        setIsTyping(true);

        setTimeout(async () => {
          try {
            const contextMsgs = messages
              .filter(m => m.id !== 'welcome' && !m.id.toString().startsWith('temp-'))
              .map(m => ({
                role: m.sender_role === 'guest' ? 'user' : 'assistant',
                content: m.content
              }));

            const response = await fetch('/v1/chat/completions', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-digitaland-support': 'true'
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  ...contextMsgs,
                  { role: 'user', content: guestMessageText }
                ]
              })
            });

            if (!response.ok) throw new Error('Gateway response error');

            const resData = await response.json();
            const aiText = resData.choices?.[0]?.message?.content || 'Pedimos desculpa, o nosso agente irá responder-te em breve.';

            const { data: aiMsg, error: aiErr } = await supabase
              .from('support_messages')
              .insert([{
                chat_id: activeChat.id,
                sender_role: 'agent',
                content: aiText
              }])
              .select()
              .single();

            if (!aiErr && aiMsg) {
              setMessages(prev => [...prev, aiMsg]);
              playNotificationSound();
            }
          } catch (err) {
            console.error('AI support failed:', err);
          } finally {
            setIsTyping(false);
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to send support message:', err);
      // Mark optimistic message as failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const getStatusTextAndColor = () => {
    switch (agentStatus) {
      case 'active':
        return { label: 'Online', color: '#22c55e', description: 'Equipa ativa. Resposta imediata.' };
      case 'away':
        return { label: 'Ausente', color: '#eab308', description: 'Auto-resposta ativa com atraso.' };
      case 'offline':
      default:
        return { label: 'Offline', color: '#ef4444', description: 'Assistente AI disponível 24/7.' };
    }
  };

  const status = getStatusTextAndColor();

  // Hide on playground pages or if user is logged out (safe early-return after all hooks)
  if (pathname.startsWith('/playground') || !user) return null;

  return (
    <div className="sc-widget">
      {/* Floating Chat Bubble */}
      <button className="sc-bubble" onClick={toggleChat} title="Live Chat Support">
        <div className="sc-bubble-icon">💬</div>
        <div className="sc-status-dot" style={{ background: status.color, boxShadow: `0 0 10px ${status.color}` }} />
        {unread > 0 && <span className="sc-unread-badge">{unread}</span>}
      </button>

      {/* Support Chat Window */}
      {isOpen && (
        <div className="sc-window">
          {/* Header */}
          <div className="sc-header">
            <div className="sc-header-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span className="sc-header-title">Digitaland Suporte</span>
                <span className="sc-header-status-badge" style={{ borderColor: status.color + '40', color: status.color }}>
                  <span className="sc-pulse-dot" style={{ background: status.color }} />
                  {status.label}
                </span>
              </div>
              <span className="sc-header-subtitle">{status.description}</span>
            </div>
            <button className="sc-close-btn" onClick={toggleChat}>✕</button>
          </div>

          {/* Messages View */}
          <div className="sc-body">
            {messages.map((m) => {
              const isGuest = m.sender_role === 'guest';
              const isSystem = m.sender_role === 'system';
              
              if (isSystem) {
                return (
                  <div key={m.id} className="sc-msg-system">
                    <span className="sc-msg-system-text">{m.content}</span>
                  </div>
                );
              }

              const formatTime = (isoString) => {
                try {
                  const d = new Date(isoString);
                  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                } catch {
                  return '';
                }
              };

              return (
                <div key={m.id} className={`sc-msg-row ${isGuest ? 'guest' : 'agent'}`}>
                  {!isGuest && (
                    <div className="sc-msg-avatar" style={{ border: `1px solid ${status.color}30` }}>
                      {m.sender_role === 'agent' ? '👤' : '🤖'}
                    </div>
                  )}
                  <div 
                    className={`sc-msg-bubble ${isGuest ? 'guest' : 'agent'}`}
                    style={isGuest ? {
                      background: 'rgba(37, 211, 102, 0.12)',
                      border: '1px solid rgba(37, 211, 102, 0.2)',
                      borderBottomRightRadius: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    } : {
                      borderBottomLeftRadius: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', wordBreak: 'break-word', color: 'var(--text)' }}>
                      {m.content}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'flex-end', 
                      gap: '0.25rem', 
                      fontSize: '0.62rem', 
                      opacity: 0.5,
                      alignSelf: 'flex-end',
                      marginTop: '-0.1rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>{formatTime(m.created_at)}</span>
                      {isGuest && (
                        <span>
                          {m.status === 'sending' ? (
                            <span style={{ fontSize: '0.6rem' }} title="A enviar...">🕒</span>
                          ) : m.status === 'failed' ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }} title="Falha ao enviar">⚠️</span>
                          ) : agentStatus === 'active' ? (
                            <span style={{ color: '#34b7f1', fontWeight: 'bold', letterSpacing: '-1.5px', fontSize: '0.75rem' }} title="Lido">✓✓</span>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '-1.5px', fontSize: '0.75rem' }} title="Entregue">✓✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="sc-msg-row agent">
                <div className="sc-msg-avatar" style={{ border: `1px solid ${status.color}30` }}>🤖</div>
                <div className="sc-msg-bubble agent sc-typing-bubble">
                  <span className="sc-dot"></span>
                  <span className="sc-dot"></span>
                  <span className="sc-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="sc-footer" onSubmit={handleSend}>
            <input
              type="text"
              className="sc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreve a tua mensagem..."
              maxLength={1000}
            />
            <button type="submit" className="sc-send-btn" disabled={!input.trim()}>
              ➔
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
