import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDynamicModels, PROVIDERS, ourPrice, openrouterPrice, savingsPercent } from '../data/models';
import { ArrowRight, ChevronDown, CheckCircle2, Shield, Zap, Globe, Sparkles, DollarSign, Clock, HelpCircle, Loader2 } from 'lucide-react';

const SAVING = savingsPercent();

export default function Pricing() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data);
      setLoading(false);
    });
  }, []);

  const featuredModels = useMemo(() => {
    // Select top flagship models for the cards
    return models.filter(m => m.badge === 'Flagship' || m.badge === 'Popular').slice(0, 3);
  }, [models]);

  const tableModels = useMemo(() => {
    // Show a diverse selection in the table
    return models.slice(0, 12);
  }, [models]);

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  const FAQ_DATA = [
    { q: 'What is Digitaland.ai?', a: 'Digitaland.ai is a unified AI API gateway providing access to 300+ frontier models from OpenAI, Anthropic, Google, xAI, Meta, Mistral, and more through a single endpoint.' },
    { q: 'How does the pay-as-you-go billing work?', a: `We operate on a pure usage-based model. You add credits to your balance, and tokens are deducted in real-time as you make requests. Our rates are consistently ~{SAVING}% lower than OpenRouter pricing.` },
    { q: 'Is there a minimum monthly commitment?', a: 'No. There are no monthly fees, no minimum usage requirements, and your credits never expire. You only pay for what you build.' },
    { q: 'How do you achieve lower prices than OpenRouter?', a: 'Through our global routing infrastructure and high-volume partnerships, we optimize request flow to provide rates below OpenRouter without compromising on speed or privacy.' },
  ];

  return (
    <main className="landing-root">
      {/* ════════════════════════════════════
         HERO SECTION
         ════════════════════════════════════ */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="container hero-center">
          <div className="status-badge fade-in-up">
            <span className="status-dot" />
            Transparent Usage-Based Billing
          </div>

          <h1 className="hero-headline-lg fade-in-up delay-1">
            Build more.
            <br />
            <span className="hero-gradient-text">Spend less.</span>
          </h1>

          <p className="hero-sub fade-in-up delay-2">
            No subscriptions. No hidden fees. Access the world's most powerful AI models 
            at rates up to {SAVING}% below OpenRouter pricing.
          </p>

          <div className="hero-btns fade-in-up delay-3" style={{ marginBottom: 0 }}>
            <Link to="/dashboard" className="btn-solid btn-lg">
              Get Started for Free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         FEATURED COMPARISON
         ════════════════════════════════════ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          ) : (
            <div className="pricing-grid-premium">
              {featuredModels.map((m, i) => {
                const p = PROVIDERS[m.provider] || { color: 'var(--primary)' };
                
                return (
                  <div className="pricing-card-elite fade-in-up" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="p-card-header">
                      <div className="p-card-icon" style={{ background: `${p.color}15`, color: p.color }}>
                        <Zap size={20} />
                      </div>
                      <div className="p-card-title">
                        <h3 style={{ textTransform: 'uppercase' }}>{m.name}</h3>
                        <span>{m.provider}</span>
                      </div>
                    </div>
                    
                      <div className="p-card-prices">
                        <div className="p-price-row">
                          <span className="label">Digitaland</span>
                          <span className="value">${ourPrice(m.offIn).toFixed(3)}<small>/1M</small></span>
                        </div>
                        <div className="p-price-row official">
                          <span className="label">OpenRouter</span>
                          <span className="value">${openrouterPrice(m.offIn).toFixed(3)}<small>/1M</small></span>
                        </div>
                      </div>
                    
                    <div className="p-card-savings">
                      <span className="save-tag">SAVE {SAVING}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════
         DETAILED PRICING TABLE
         ════════════════════════════════════ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-title">
            <h2>Detailed Price Comparison</h2>
            <p>Our rates vs OpenRouter — always {SAVING}% below</p>
          </div>

          <div className="pricing-table-premium fade-in-up">
            <div className="pt-header">
              <div className="pt-col model">Model</div>
              <div className="pt-col price">Input / 1M</div>
              <div className="pt-col price">Output / 1M</div>
              <div className="pt-col savings">Savings</div>
            </div>
            
            <div className="pt-body">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} />
                </div>
              ) : (
                tableModels.map((m, i) => (
                  <div className="pt-row" key={i}>
                    <div className="pt-col model">
                      <div className="model-info">
                        <span className="m-name">{m.name}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase', marginLeft: '0.5rem' }}>{m.provider}</span>
                      </div>
                    </div>
                    <div className="pt-col price">
                      <div className="price-compare">
                        <span className="our-p">${ourPrice(m.offIn).toFixed(3)}</span>
                        <span className="off-p">${openrouterPrice(m.offIn).toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="pt-col price">
                      <div className="price-compare">
                        <span className="our-p">${ourPrice(m.offOut).toFixed(3)}</span>
                        <span className="off-p">${openrouterPrice(m.offOut).toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="pt-col savings">
                      <span className="s-badge">-{SAVING}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/models" className="btn-outline">
              View All 300+ Models <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         BENEFITS GRID
         ════════════════════════════════════ */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <h2>Why our pricing is different</h2>
            <p>Designed for developers who value transparency and scalability</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <DollarSign size={24} />,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                title: 'Pure Pay-As-You-Go',
                desc: 'No monthly subscriptions, no seat-based pricing, and no minimum usage tiers. You are billed only for what you consume, with per-token granularity.',
                highlight: 'Usage-based'
              },
              {
                icon: <Clock size={24} />,
                color: '#6366f1',
                bg: 'rgba(99,102,241,0.08)',
                title: 'Credits Never Expire',
                desc: 'Unlike competitors that reset your balance monthly, your Digitaland credits stay in your account forever. Use them today or a year from now.',
                highlight: 'Permanent balance'
              },
              {
                icon: <Shield size={24} />,
                color: '#f59e0b',
                bg: 'rgba(245,158,11,0.08)',
                title: 'Enterprise SLAs',
                desc: 'Enjoy competitive pricing without sacrificing reliability. Our multi-region redundancy ensures 99.9% uptime for your production workloads.',
                highlight: 'Reliability guaranteed'
              }
            ].map((f, i) => (
              <div className="feature-card" key={i}>
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
         FAQ
         ════════════════════════════════════ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-title">
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {FAQ_DATA.map((f, i) => (
              <div className="faq-item" key={i}>
                <button className="faq-trigger" onClick={() => toggleFaq(i)}>
                  <span>{f.q}</span>
                  <ChevronDown size={18} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {openFaq === i && (
                  <div className="faq-content">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
