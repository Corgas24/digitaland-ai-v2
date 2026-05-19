import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FEATURED_MODELS, PROVIDERS, MARKUP, ourPrice, savingsPercent } from '../data/models';
import { Copy, ArrowRight, Zap, Shield, Code, ChevronDown, CheckCircle2, Globe, Clock, Lock, Terminal, Check, DollarSign, Layers, Search, Server, Sparkles, Cpu, Send } from 'lucide-react';

/* ═══════════════════════════════════════════════
   Typing animation for the terminal
   ═══════════════════════════════════════════════ */
function TypeWriter({ text, delay = 40, onDone }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        onDone && onDone();
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);
  return <>{displayed}<span className="cursor-blink">█</span></>;
}

/* ═══════════════════════════════════════════════
   Featured Model Card
   ═══════════════════════════════════════════════ */
function ModelCard({ model, provider }) {
  const prov = PROVIDERS[provider];
  return (
    <div className="model-card-elite glass-card">
      <div className="mce-header">
        <div className="mce-icon" style={{ background: prov?.color + '18', color: prov?.color }}>
          {prov?.short}
        </div>
        <div className="mce-info">
          <h4>{model.name}</h4>
          <span className="mce-provider">{provider}</span>
        </div>
        {model.badge && <span className={`mce-badge mce-badge-${model.badge.toLowerCase()}`}>{model.badge}</span>}
      </div>
      <div className="mce-pricing">
        <div className="mce-price-row">
          <span className="mce-label">Input</span>
          <span className="mce-value">${ourPrice(model.offIn).toFixed(3)}</span>
        </div>
        <div className="mce-price-row">
          <span className="mce-label">Output</span>
          <span className="mce-value">${ourPrice(model.offOut).toFixed(3)}</span>
        </div>
        <span className="mce-unit">per 1M tokens</span>
      </div>
    </div>
  );
}

export default function Landing() {
   const [openFaq, setOpenFaq] = useState(null);
   const [copied, setCopied] = useState(false);
   const [termStep, setTermStep] = useState(0);
   const savPct = savingsPercent();

   const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

   const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const faqSavings = `up to ${savPct}% below CrazyRouter pricing`;
  const faqs = [
    { q: "What is Digitaland.ai?", a: "Digitaland.ai is a unified AI API gateway that gives you access to 300+ models from OpenAI, Anthropic, Google, xAI, DeepSeek, Meta, Mistral and many more — all through a single API key and OpenAI-compatible endpoint." },
    { q: "How does pricing work?", a: `We offer competitive, usage-based pricing with rates ${faqSavings}. No monthly fees, no subscriptions — pure pay-as-you-go. You only pay for the tokens you actually consume. Check our pricing page for exact per-model costs.` },
    { q: "Is it really OpenAI-compatible?", a: "Yes! Just change your base_url to https://api.digitaland.ai/v1 and use your Digitaland API key. Works with the official OpenAI SDK, LangChain, LlamaIndex, and any other OpenAI-compatible library." },
    { q: "Which models are supported?", a: "We support 300+ models including GPT-5.5, Claude 4.7, Gemini 3 Pro, Grok, DeepSeek V3, Qwen3, Llama 4, Mistral Large, and many more. New models are added within hours of release." },
    { q: "How does Digitaland protect my data?", a: "Enterprise-grade encryption for all data in transit and at rest. We operate a strict zero-log policy — your prompts, completions, and API keys are never stored, logged, or used for training." },
    { q: "What happens if a provider goes down?", a: "Our intelligent routing automatically fails over to backup nodes. We maintain 99.9% uptime with redundant infrastructure across multiple regions." }
  ];

  const topModels = [
    { name: 'gpt-5.5', provider: 'OpenAI', offIn: 2.75, offOut: 16.50, badge: 'Flagship' },
    { name: 'claude-opus-4-7', provider: 'Anthropic', offIn: 2.75, offOut: 13.75, badge: 'Flagship' },
    { name: 'gemini-3.1-pro', provider: 'Google', offIn: 1.10, offOut: 6.60, badge: 'Flagship' },
    { name: 'grok-4', provider: 'xAI', offIn: 1.65, offOut: 8.25, badge: 'Flagship' },
    { name: 'deepseek-r1', provider: 'DeepSeek', offIn: 0.495, offOut: 1.98, badge: 'Reasoning' },
    { name: 'claude-sonnet-4-6', provider: 'Anthropic', offIn: 1.65, offOut: 8.25, badge: 'Popular' },
    { name: 'gpt-4.1', provider: 'OpenAI', offIn: 1.10, offOut: 4.40, badge: 'Popular' },
    { name: 'qwen3-235b-a22b', provider: 'Alibaba', offIn: 0.22, offOut: 0.88, badge: 'Popular' },
    { name: 'llama-4-maverick', provider: 'Meta', offIn: 0.20, offOut: 0.60, badge: 'Flagship' },
    { name: 'gpt-5-mini', provider: 'OpenAI', offIn: 0.138, offOut: 1.10, badge: 'Value' },
    { name: 'deepseek-v4-flash', provider: 'DeepSeek', offIn: 0.14, offOut: 0.28, badge: 'Value' },
    { name: 'mistral-large-3', provider: 'Mistral', offIn: 2.00, offOut: 6.00, badge: 'Flagship' },
  ];

  return (
    <div className="landing-root" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="neural-grid-bg" />
      {/* ════════════════════════════════════
         HERO SECTION
         ════════════════════════════════════ */}
      <header className="hero" style={{ padding: '8rem 0' }}>
        <div className="container hero-center">
          <div className="status-badge glass-card" style={{ animation: 'fadeInDown 0.8s ease-out' }}>
            <span className="status-dot neural-pulse"></span>
            NEURAL GATEWAY ONLINE v2.0
          </div>
          
          <h1 className="hero-headline-lg fade-in-up delay-1">
            <span>Next-Gen</span> API for<br />
            <span className="hero-gradient-text">Neural Intelligence</span>
          </h1>
          
          <p className="hero-sub fade-in-up delay-2" style={{ fontWeight: 600 }}>
            Unified access to 300+ AI models. Optimized for speed, 
            secured with end-to-end encryption, and priced for scale.
          </p>

          <div className="hero-input-group glass-card fade-in-up delay-2" style={{ boxShadow: '0 0 30px rgba(99,102,241,0.2)' }}>
            <span className="url" style={{ fontWeight: 800, color: 'var(--primary)' }}>https://api.digitaland.ai/v1</span>
            <button className="copy-btn" onClick={() => handleCopy('https://api.digitaland.ai/v1')} title="Copy URL">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          <div className="hero-btns fade-in-up delay-3">
            <Link to="/playground" className="premium-btn" style={{ padding: '1rem 2.5rem', borderRadius: '15px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800 }}>
              Start Building — It's Free <ArrowRight size={18} />
            </Link>
            <Link to="/models" className="btn-outline" style={{ padding: '1rem 2.5rem', borderRadius: '15px' }}>
              Explore Models
            </Link>
          </div>

          <div className="hero-social-proof fade-in-up delay-4">
            <div className="hsp-item">
              <Sparkles size={14} />
              <span><strong>300+</strong> AI Models</span>
            </div>
            <div className="hsp-divider" />
            <div className="hsp-item">
              <Zap size={14} />
              <span><strong>&lt;200ms</strong> Latency</span>
            </div>
            <div className="hsp-divider" />
            <div className="hsp-item">
              <Shield size={14} />
              <span><strong>99.9%</strong> Uptime</span>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════
         PROVIDER TRUST BAR
         ════════════════════════════════════ */}
      <div className="trusted-bar">
        <div className="container trusted-inner">
          <p>Powering developers worldwide with models from</p>
          <div className="trusted-logos">
            {Object.entries(PROVIDERS).slice(0, 8).map(([name, p]) => (
              <div className="trusted-logo-item" key={name}>
                <span className="trusted-dot" style={{ background: p.color }} />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
         STATS ROW
         ════════════════════════════════════ */}
      <div className="container">
        <div className="stats-row">
          {[
            { num: '300+', label: 'AI Models', icon: <Layers size={20} /> },
            { num: '99.9%', label: 'Uptime SLA', icon: <Server size={20} /> },
            { num: '<200ms', label: 'Avg Latency', icon: <Zap size={20} /> },
            { num: `~${savPct}%`, label: 'Below CrazyRouter', icon: <DollarSign size={20} /> },
          ].map((s, i) => (
            <div className="stat-item" key={i}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════
         INTERACTIVE PREVIEW SECTION
         ════════════════════════════════════ */}
      <section style={{ padding: '10rem 0', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '6rem', alignItems: 'center' }}>
          
          {/* Left Side: Content (Asymmetric Narrow) */}
          <div className="fade-in-left" style={{ position: 'relative', zIndex: 10 }}>
            <div className="glass-card" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', color: 'var(--primary)', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 900, marginBottom: '2rem', letterSpacing: '2px', border: '1px solid var(--primary)' }}>
              <Sparkles size={14} /> LIVE NEURAL LABORATORY
            </div>
            
            <h2 style={{ fontSize: '4.2rem', fontWeight: 950, lineHeight: 0.9, marginBottom: '2.5rem', letterSpacing: '-4px', color: 'var(--text)' }}>
              Experience <br /><span className="hero-gradient-text">Neural Edge</span>
            </h2>
            
            <p style={{ fontSize: '1.2rem', color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: '3.5rem', fontWeight: 500, maxWidth: '90%' }}>
              Test our infrastructure directly. Switch between models with near-zero latency and feel the power of our optimized gateway.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
              {[
                'Unified API for all major LLMs',
                'Intelligent SHA-256 caching layer',
                'Real-time token usage analytics',
                '1.4x optimized profit-markup model'
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--primary)', flexShrink: 0 }}>
                    <Check size={18} />
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: 'block' }}>
              <Link to="/playground" className="magic-btn" style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '1rem', borderRadius: '15px' }}>
                Start Building Now <ArrowRight size={22} />
              </Link>
            </div>
          </div>

          {/* Right Side: Chat Preview (Asymmetric Wide & Tilted) */}
          <div className="fade-in-right" style={{ perspective: '1000px' }}>
            <div className="glass-card" style={{ 
              padding: '4rem', 
              borderRadius: '50px', 
              position: 'relative', 
              overflow: 'hidden',
              transform: 'rotateY(-5deg) rotateX(2deg)',
              boxShadow: '20px 40px 100px rgba(0,0,0,0.5)'
            }}>
              
              {/* Mock Chat UI Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '2.5rem' }}>
                 <div style={{ 
                   width: '60px', height: '60px', 
                   background: 'linear-gradient(135deg, var(--primary) 0%, #ec4899 100%)', 
                   borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                   boxShadow: '0 0 30px rgba(99,102,241,0.5)'
                 }}>
                    <Cpu size={30} />
                 </div>
                 <div>
                    <p style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', marginBottom: '0.25rem' }}>Neural Gateway <span style={{ color: '#22c55e', fontSize: '0.8rem', marginLeft: '1rem', fontWeight: 900, textTransform: 'uppercase' }}>● ONLINE</span></p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.5, fontWeight: 700, letterSpacing: '1px' }}>Active Core: GPT-4o_MAX</p>
                 </div>
              </div>

              {/* Chat Body */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginBottom: '4rem' }}>
                 <div className="glass-card" style={{ padding: '1.5rem 2rem', borderRadius: '30px 4px 30px 30px', alignSelf: 'flex-end', maxWidth: '80%', fontSize: '1.1rem', fontWeight: 600, border: '1px solid var(--primary)' }}>
                    Analyze high-frequency token streams.
                 </div>
                 <div className="glass-card" style={{ padding: '1.5rem 2rem', borderRadius: '4px 30px 30px 30px', alignSelf: 'flex-start', maxWidth: '85%', fontSize: '1.1rem', fontWeight: 600, background: 'rgba(255,255,255,0.02)' }}>
                    Processing... Latency: <span style={{ color: '#22c55e' }}>8ms</span>. Stream optimized via Node_Alpha.
                 </div>
              </div>

              {/* Chat Input Mock */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="glass-card" style={{ flex: 1, height: '54px', borderRadius: '100px', opacity: 0.4 }} />
                <div className="magic-btn" style={{ width: '54px', height: '54px', borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Get started in seconds</h2>
            <p>Just change your base URL — works with any OpenAI-compatible SDK</p>
          </div>

          <div className="terminal-showcase">
            <div className="terminal-tabs">
              <button className={`terminal-tab ${termStep === 0 ? 'active' : ''}`} onClick={() => setTermStep(0)}>
                <Terminal size={14} /> Python
              </button>
              <button className={`terminal-tab ${termStep === 1 ? 'active' : ''}`} onClick={() => setTermStep(1)}>
                <Terminal size={14} /> Node.js
              </button>
              <button className={`terminal-tab ${termStep === 2 ? 'active' : ''}`} onClick={() => setTermStep(2)}>
                <Terminal size={14} /> cURL
              </button>
            </div>

            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span style={{ background: '#ef4444' }} />
                  <span style={{ background: '#f59e0b' }} />
                  <span style={{ background: '#22c55e' }} />
                </div>
                <span className="terminal-title">
                  {termStep === 0 ? 'quickstart.py' : termStep === 1 ? 'quickstart.js' : 'terminal'}
                </span>
                <button className="terminal-copy" onClick={() => handleCopy(
                  termStep === 0 ? pythonCode : termStep === 1 ? nodeCode : curlCode
                )}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="terminal-body">
                <code>
                  {termStep === 0 ? <PythonSnippet /> : termStep === 1 ? <NodeSnippet /> : <CurlSnippet />}
                </code>
              </pre>
            </div>

            <div className="terminal-steps">
              <div className="t-step">
                <div className="t-step-num">1</div>
                <div>
                  <strong>Get your API key</strong>
                  <p>Sign up and generate your key from the dashboard</p>
                </div>
              </div>
              <div className="t-step">
                <div className="t-step-num">2</div>
                <div>
                  <strong>Set the base URL</strong>
                  <p>Point your SDK to <code>https://api.digitaland.ai/v1</code></p>
                </div>
              </div>
              <div className="t-step">
                <div className="t-step-num">3</div>
                <div>
                  <strong>Start calling any model</strong>
                  <p>Access 300+ models — GPT, Claude, Gemini, Grok & more</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         WHY CHOOSE
         ════════════════════════════════════ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-title">
            <h2>Built for production workloads</h2>
            <p>Enterprise-grade infrastructure that scales with your ambitions</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <Zap size={24} />,
                color: '#6366f1',
                bg: 'rgba(99,102,241,0.08)',
                title: 'Intelligent Routing',
                desc: 'Requests are automatically routed through our global edge network to the nearest available node, ensuring consistently low latency at scale.',
                highlight: 'Avg. latency < 200ms'
              },
              {
                icon: <Shield size={24} />,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                title: 'Zero-Log Architecture',
                desc: 'Your prompts and completions are never logged, stored, or used for training. End-to-end encryption protects every request in transit and at rest.',
                highlight: 'SOC 2 compliant'
              },
              {
                icon: <Code size={24} />,
                color: '#f59e0b',
                bg: 'rgba(245,158,11,0.08)',
                title: 'Drop-In Compatible',
                desc: 'Fully OpenAI-compatible API — works natively with the official SDKs, LangChain, LlamaIndex, and every major AI framework. One line change to migrate.',
                highlight: 'OpenAI SDK compatible'
              },
              {
                icon: <DollarSign size={24} />,
                color: '#ec4899',
                bg: 'rgba(236,72,153,0.08)',
                title: 'Transparent Pricing',
                desc: 'Usage-based pricing with rates consistently below CrazyRouter. No monthly commitments, no hidden fees, no surprises on your invoice.',
                highlight: `Up to ${savPct}% cheaper than CrazyRouter`
              },
              {
                icon: <Globe size={24} />,
                color: '#06b6d4',
                bg: 'rgba(6,182,212,0.08)',
                title: 'Unified Model Catalog',
                desc: 'A single API key unlocks every major frontier model — from GPT-5.5 and Claude 4.7 to Gemini 3 Pro, Grok, and DeepSeek V3. New models added within hours.',
                highlight: '300+ models · 20+ providers'
              },
              {
                icon: <Server size={24} />,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.08)',
                title: 'Enterprise Reliability',
                desc: 'Multi-region redundancy with automatic failover ensures your production workloads never go down. Backed by an enterprise SLA you can depend on.',
                highlight: '99.9% uptime SLA'
              },
            ].map((f, i) => (
              <div className="feature-card glass-card" key={i}>
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}><>{f.icon}</></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.highlight && <span className="feature-highlight">{f.highlight}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         TOP MODELS GRID
         ════════════════════════════════════ */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Top AI Models</h2>
            <p>Access frontier models from every major provider at competitive rates</p>
          </div>

          <div className="models-elite-grid">
            {topModels.map((m, i) => (
              <ModelCard key={i} model={m} provider={m.provider} />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/models" className="btn-solid" style={{ padding: '0.9rem 2.5rem' }}>
              Browse All 300+ Models <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         PRICING COMPARISON
         ════════════════════════════════════ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-title">
            <h2>Transparent pricing — always fair</h2>
            <p>Competitive rates, consistently below CrazyRouter. No hidden fees, ever.</p>
          </div>

          <div className="pricing-table-wrap glass-card">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Input / 1M tokens</th>
                  <th>Output / 1M tokens</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {topModels.slice(0, 8).map((m, i) => (
                  <tr key={i}>
                    <td className="pt-model">
                      <div className="pt-icon" style={{ background: PROVIDERS[m.provider]?.color + '18', color: PROVIDERS[m.provider]?.color }}>
                        {PROVIDERS[m.provider]?.short}
                      </div>
                      {m.name}
                    </td>
                    <td className="pt-provider">{m.provider}</td>
                    <td className="pt-price">${ourPrice(m.offIn).toFixed(3)}</td>
                    <td className="pt-price">${ourPrice(m.offOut).toFixed(3)}</td>
                    <td><span className={`mce-badge mce-badge-${(m.badge || '').toLowerCase()}`}>{m.badge}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/pricing" className="btn-outline">View Full Pricing →</Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         FAQ SECTION
         ════════════════════════════════════ */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about Digitaland</p>
          </div>

          <div className="faq-list">
            {faqs.map((f, i) => (
              <div className="faq-item glass-card" key={i} style={openFaq === i ? { borderColor: 'var(--primary)', background: 'var(--primary-soft)' } : {}}>
                <button className="faq-trigger" onClick={() => toggleFaq(i)}>
                  <span>{f.q}</span>
                  <ChevronDown size={18} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: '0.25s', color: openFaq === i ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                </button>
                {openFaq === i && <div className="faq-content">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         FINAL CTA
         ════════════════════════════════════ */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to build with 300+ AI models?</h2>
          <p>Join developers worldwide who trust Digitaland.ai for production AI</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/playground" className="magic-btn btn-lg" style={{ padding: '1rem 2.5rem' }}>
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link to="/docs" className="btn-outline" style={{ padding: '1rem 2.5rem' }}>
              API Documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Code Snippets for the terminal (Highlighted)
   ═══════════════════════════════════════════════ */
const PythonSnippet = () => (
  <>
    <span className="t-comment"># pip install openai</span>{"\n"}
    <span className="t-keyword">from</span> openai <span className="t-keyword">import</span> OpenAI{"\n"}
    {"\n"}
    client = <span className="t-func">OpenAI</span>({"\n"}
    {"    "}base_url=<span className="t-string">"https://api.digitaland.ai/v1"</span>,{"\n"}
    {"    "}api_key=<span className="t-string">"sk-your-digitaland-key"</span>{"\n"}
    ){"\n"}
    {"\n"}
    response = client.chat.completions.<span className="t-func">create</span>({"\n"}
    {"    "}model=<span className="t-string">"gpt-5.5"</span>,  <span className="t-comment"># or claude-opus-4-7, etc.</span>{"\n"}
    {"    "}messages=[{"\n"}
    {"        "}{"{"}<span className="t-string">"role"</span>: <span className="t-string">"user"</span>, <span className="t-string">"content"</span>: <span className="t-string">"Hello from Digitaland!"</span>{"}"}{"\n"}
    {"    "}]{"\n"}
    ){"\n"}
    {"\n"}
    <span className="t-func">print</span>(response.choices[<span className="t-num">0</span>].message.content)
  </>
);

const NodeSnippet = () => (
  <>
    <span className="t-comment">// npm install openai</span>{"\n"}
    <span className="t-keyword">import</span> OpenAI <span className="t-keyword">from</span> <span className="t-string">'openai'</span>;{"\n"}
    {"\n"}
    <span className="t-keyword">const</span> client = <span className="t-keyword">new</span> <span className="t-func">OpenAI</span>({"{"}{"\n"}
    {"    "}baseURL: <span className="t-string">'https://api.digitaland.ai/v1'</span>,{"\n"}
    {"    "}apiKey: <span className="t-string">'sk-your-digitaland-key'</span>,{"\n"}
    {"}"});{"\n"}
    {"\n"}
    <span className="t-keyword">const</span> response = <span className="t-keyword">await</span> client.chat.completions.<span className="t-func">create</span>({"{"}{"\n"}
    {"    "}model: <span className="t-string">'claude-sonnet-4-6'</span>, <span className="t-comment">// or gpt-5.5, etc.</span>{"\n"}
    {"    "}messages: [{"\n"}
    {"        "}{"{"} role: <span className="t-string">'user'</span>, content: <span className="t-string">'Hello from Digitaland!'</span> {"}"}{"\n"}
    {"    "}],{"\n"}
    {"}"});{"\n"}
    {"\n"}
    console.<span className="t-func">log</span>(response.choices[<span className="t-num">0</span>].message.content);
  </>
);

const CurlSnippet = () => (
  <>
    <span className="t-func">curl</span> https://api.digitaland.ai/v1/chat/completions \<br />
    {"  "}-H <span className="t-string">"Content-Type: application/json"</span> \<br />
    {"  "}-H <span className="t-string">"Authorization: Bearer sk-your-digitaland-key"</span> \<br />
    {"  "}-d <span className="t-string">'{"{"}'</span>{"\n"}
    {"    "}<span className="t-prop">"model"</span>: <span className="t-string">"grok-4"</span>,{"\n"}
    {"    "}<span className="t-prop">"messages"</span>: [{"\n"}
    {"      "}{"{"}<span className="t-prop">"role"</span>: <span className="t-string">"user"</span>, <span className="t-prop">"content"</span>: <span className="t-string">"Hello from Digitaland!"</span>{"}"}{"\n"}
    {"    "}]{"\n"}
    {"  "}<span className="t-string">'{"}"}'</span>
  </>
);

// Helper for copy (using raw strings)
const pythonCode = `# pip install openai
from openai import OpenAI

client = OpenAI(
    base_url="https://api.digitaland.ai/v1",
    api_key="sk-your-digitaland-key"
)

response = client.chat.completions.create(
    model="gpt-5.5",
    messages=[
        {"role": "user", "content": "Hello from Digitaland!"}
    ]
)

print(response.choices[0].message.content)`;

const nodeCode = `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.digitaland.ai/v1',
  apiKey: 'sk-your-digitaland-key',
});

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-6',
  messages: [
    { role: 'user', content: 'Hello from Digitaland!' }
  ],
});

console.log(response.choices[0].message.content);`;

const curlCode = `curl https://api.digitaland.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-your-digitaland-key" \\
  -d '{
    "model": "grok-4",
    "messages": [
      {"role": "user", "content": "Hello from Digitaland!"}
    ]
  }'`;