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

  // Hide on playground pages or if user is logged out
  if (pathname.startsWith('/playground') || !user) return null;

  // 1. Initialise Authenticated Session ID from logged-in user
  useEffect(() => {
    if (user?.id) {
      setSessionId(user.id);
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

  // 3. Load Active Chat Session for Guest
  useEffect(() => {
    if (!sessionId) return;

    async function loadChat() {
      try {
        const { data, error } = await supabase
          .from('support_chats')
          .select('*')
          .eq('guest_session_id', sessionId)
          .eq('status', 'open')
          .maybeSingle();

        if (!error && data) {
          setChat(data);
          // Fetch existing messages
          const { data: msgs } = await supabase
            .from('support_messages')
            .select('*')
            .eq('chat_id', data.id)
            .order('id', { ascending: true });
          if (msgs) setMessages(msgs);
        } else {
          // If no active chat, set message state to a friendly welcome message
          setMessages([
            { id: 'welcome', sender_role: 'system', content: 'Olá! Sou o assistente inteligente da Digitaland. Como posso ajudar-te hoje?', created_at: new Date().toISOString() }
          ]);
        }
      } catch (err) {
        console.warn('Could not load chat:', err);
      }
    }
    loadChat();
  }, [sessionId]);

  // 4. Subscribe to Live Support Messages when Chat ID is set
  useEffect(() => {
    if (!chat?.id) return;

    if (chatChannelRef.current) chatChannelRef.current.unsubscribe();

    const channel = supabase
      .channel(`support_chat:${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chat.id}` }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });

        // Trigger unread indicator if closed
        if (!isOpen) {
          setUnread(u => u + 1);
        }
      })
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [chat?.id, isOpen]);

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

  // 5. Send Message Handler
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const guestMessageText = input.trim();
    setInput('');

    let activeChat = chat;

    // 5a. Create Support Chat session in database if it doesn't exist yet
    if (!activeChat) {
      try {
        const { data: newChat, error } = await supabase
          .from('support_chats')
          .insert([{ 
            guest_session_id: sessionId, 
            guest_name: user?.email || 'User ' + sessionId.slice(-4) 
          }])
          .select()
          .single();

        if (error) throw error;
        activeChat = newChat;
        setChat(newChat);
      } catch (err) {
        console.error('Failed to create support chat session:', err);
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

      setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), newMsg]);

      // 5c. Run AI Support bot if status is Offline or Away (or fallback)
      if (agentStatus === 'offline' || agentStatus === 'away') {
        setIsTyping(true);

        setTimeout(async () => {
          try {
            // Get past 6 messages for context
            const contextMsgs = messages
              .filter(m => m.id !== 'welcome')
              .map(m => ({
                role: m.sender_role === 'guest' ? 'user' : 'assistant',
                content: m.content
              }));

            // Call public anonymous support gateway completions with custom header
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
            const aiText = resData.choices?.[0]?.message?.content || 'Pedimos desculpa, estamos com dificuldades técnicas. O nosso agente irá responder-te em breve.';

            // Insert AI Response as 'agent' in the database support chat
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
            }
          } catch (err) {
            console.error('AI support failed:', err);
          } finally {
            setIsTyping(false);
          }
        }, 1200); // 1.2s realistic support thinking delay
      }
    } catch (err) {
      console.error('Failed to send support message:', err);
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

              return (
                <div key={m.id} className={`sc-msg-row ${isGuest ? 'guest' : 'agent'}`}>
                  {!isGuest && (
                    <div className="sc-msg-avatar" style={{ border: `1px solid ${status.color}30` }}>
                      {m.sender_role === 'agent' ? '👤' : '🤖'}
                    </div>
                  )}
                  <div className={`sc-msg-bubble ${isGuest ? 'guest' : 'agent'}`}>
                    {m.content}
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
