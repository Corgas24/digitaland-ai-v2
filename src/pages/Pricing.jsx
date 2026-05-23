import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDynamicModels, PROVIDERS, ourPrice, openrouterPrice, savingsPercent } from '../data/models';
import { 
  ArrowRight, ChevronDown, CheckCircle2, Shield, Zap, Globe, Sparkles, 
  DollarSign, Clock, HelpCircle, Loader2, Search, Sliders, PlayCircle
} from 'lucide-react';

const GLOBAL_SAVING = savingsPercent();

export default function Pricing() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Savings Calculator State
  const [tokenVolume, setTokenVolume] = useState(25); // Default: 25M tokens/month
  const [selectedTier, setSelectedTier] = useState('flagship'); // mini | flagship | sonnet

  useEffect(() => {
    getDynamicModels().then(data => {
      setModels(data || []);
      setLoading(false);
    });
  }, []);

  const featuredModels = useMemo(() => {
    // Select top flagship models for the spotlight cards
    if (!models || models.length === 0) return [];
    return models.filter(m => m.badge === 'Flagship' || m.badge === 'Popular').slice(0, 3);
  }, [models]);

  // Find model for calculator comparison dynamically
  const calcModel = useMemo(() => {
    if (!models || models.length === 0) return null;
    if (selectedTier === 'mini') {
      return models.find(m => m.id.includes('mini') || m.name.toLowerCase().includes('mini')) || models[0];
    }
    if (selectedTier === 'sonnet') {
      return models.find(m => m.id.includes('sonnet') || m.name.toLowerCase().includes('sonnet') || m.name.toLowerCase().includes('opus')) || models[0];
    }
    return models.find(m => m.id === 'gpt-4o' || (m.name.toLowerCase().includes('4o') && !m.name.toLowerCase().includes('mini'))) || models.find(m => m.badge === 'Flagship') || models[0];
  }, [models, selectedTier]);

  // Compute calculated pricing
  const calculatorCosts = useMemo(() => {
    if (!calcModel) return { ours: 0, official: 0, saved: 0, pct: 0 };
    const oursVal = ourPrice(calcModel.offIn) * tokenVolume;
    const officialVal = openrouterPrice(calcModel.offIn) * tokenVolume;
    const savedVal = Math.max(officialVal - oursVal, 0);
    const pctVal = Math.round((1 - (ourPrice(calcModel.offIn) / openrouterPrice(calcModel.offIn))) * 100);
    return {
      ours: oursVal,
      official: officialVal,
      saved: savedVal,
      pct: isNaN(pctVal) ? GLOBAL_SAVING : pctVal
    };
  }, [calcModel, tokenVolume]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models.filter(m => {
      if (!m) return false;
      const query = searchQuery ? searchQuery.toLowerCase() : '';
      const nameLower = (m.name || '').toLowerCase();
      const providerLower = (m.provider || '').toLowerCase();
      return nameLower.includes(query) || providerLower.includes(query);
    });
  }, [models, searchQuery]);

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  const FAQ_DATA = [
    { q: 'O que é o Digitaland.ai?', a: 'O Digitaland.ai é um gateway API unificado para inteligência artificial. Oferecemos acesso ultra-rápido a mais de 300 modelos de ponta (OpenAI, Anthropic, Google, xAI, Meta, Mistral) através de uma única integração simples.' },
    { q: 'Como funciona a faturação em tempo real (Pay-As-You-Go)?', a: `Não existem taxas mensais nem subscrições. Adiciona créditos ao teu saldo e os tokens são debitados em tempo real à medida que fazes requisições. As nossas tarifas são garantidamente 30% mais baratas que a OpenRouter.` },
    { q: 'Existe algum compromisso de consumo mínimo?', a: 'Nenhum. Podes testar com apenas $1 e os teus créditos nunca expiram. Pagas apenas pelos tokens que a tua aplicação realmente consome.' },
    { q: 'Como garantem preços mais baixos que a OpenRouter?', a: 'Graças ao nosso motor de routing inteligente global e parcerias de alto volume de processamento, conseguimos otimizar a latência e repassar as economias diretamente para os programadores.' },
  ];

  return (
    <main className="landing-root" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Mesh Orbs */}
      <div className="mesh-bg" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="mesh-blob blob-1" style={{ position: 'absolute', width: '900px', height: '900px', top: '-15%', left: '-10%', opacity: 0.08, background: 'var(--primary)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div className="mesh-blob blob-2" style={{ position: 'absolute', width: '700px', height: '700px', bottom: '20%', right: '-5%', opacity: 0.08, background: 'var(--secondary)', borderRadius: '50%', filter: 'blur(120px)' }} />
      </div>

      {/* ════════════════════════════════════
         ASYMMETRICAL HERO SECTION
         ════════════════════════════════════ */}
      <section className="hero" style={{ padding: '8rem 0 6rem', minHeight: 'auto', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="pricing-hero-split">
            {/* Left Column: Vision Statement */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1.5rem' }}>
              <div className="status-badge" style={{ margin: '0' }}>
                <span className="status-dot" />
                ⚡ Pure Pay-as-you-go API Gateway
              </div>
              
              <h1 className="hero-headline-lg" style={{ fontSize: '4rem', margin: '0.5rem 0', textAlign: 'left', lineHeight: 1.05 }}>
                Frontier AI Power.<br />
                <span className="hero-gradient-text">30% Cheaper.</span>
              </h1>
              
              <p className="hero-sub" style={{ margin: '0', textAlign: 'left', fontSize: '1.15rem', maxWidth: '580px', color: 'var(--text-dim)' }}>
                Integra GPT-5.5, Claude Opus 4.7, Gemini 3.1 Pro e centenas de outros modelos com uma única linha de código. Sem mensalidades, sem limites de assento. Faturação pura por token de consumo.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <Link to="/dashboard" className="btn-solid btn-lg">
                  Criar Conta Gratuita <ArrowRight size={18} />
                </Link>
                <a href="#rates-table" className="btn-outline btn-lg" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('rates-table')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Explorar Modelos Matrix
                </a>
              </div>

              {/* Trust Indicators */}
              <div style={{ display: 'flex', gap: '2.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                {[
                  { value: '260+', label: 'Active Models' },
                  { value: '30%', label: 'Cheaper Guaranteed' },
                  { value: '0.005s', label: 'Response Overhead' },
                  { value: '99.9%', label: 'Uptime SLA' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font)', lineHeight: 1.1 }}>{item.value}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Savings Calculator Card */}
            <div>
              <div className="calculator-card">
                <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px' }}> Savings Calculator</h3>
                  <span className="save-tag savings-badge-glow" style={{ fontSize: '0.7rem' }}>SAVE {calculatorCosts.pct}%</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-alt)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                  {[
                    { id: 'mini', label: 'Flash/Mini' },
                    { id: 'flagship', label: 'Flagship' },
                    { id: 'sonnet', label: 'Reasoning/Pro' }
                  ].map(tier => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      style={{
                        flex: 1, padding: '0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800,
                        background: selectedTier === tier.id ? 'var(--surface)' : 'transparent',
                        color: selectedTier === tier.id ? 'var(--text)' : 'var(--text-muted)',
                        transition: '0.2s', border: 'none', cursor: 'pointer'
                      }}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Volume de Mensagens Estimado</span>
                    <span style={{ color: 'var(--primary)', fontFamily: 'var(--mono)' }}>{tokenVolume}M tokens/mês</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={tokenVolume}
                    onChange={(e) => setTokenVolume(parseInt(e.target.value))}
                    className="premium-slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span>1M Tokens</span>
                    <span>250M Tokens</span>
                    <span>500M Tokens</span>
                  </div>
                </div>

                {/* Pricing Outputs Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--bg-alt)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>OpenRouter Estimado</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'line-through', fontFamily: 'var(--mono)' }}>
                      ${calculatorCosts.official.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 700 }}>Preço Digitaland</span>
                    <span style={{ fontSize: '1.2rem', color: 'var(--green)', fontWeight: 800, fontFamily: 'var(--mono)' }}>
                      ${calculatorCosts.ours.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.25rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800 }}>Poupança Líquida Mensal</span>
                    <span style={{ fontSize: '1.3rem', color: 'var(--primary)', fontWeight: 950, fontFamily: 'var(--mono)', textShadow: '0 0 15px var(--primary-soft)' }}>
                      ${calculatorCosts.saved.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  *Baseado no custo de entrada de {calcModel?.name || 'modelo selecionado'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         FEATURED SPOTLIGHTS WITH BRAND LOGOS
         ════════════════════════════════════ */}
      <section className="section" style={{ padding: '4rem 0 6rem', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="section-title" style={{ marginBottom: '6rem' }}>
            <h2>Flagship Neural Spotlight</h2>
            <p>Os modelos mais populares do mundo com preços massivamente reduzidos</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          ) : (
            <div className="pricing-spotlight-grid">
              {featuredModels.map((m, i) => {
                if (!m) return null;
                const p = PROVIDERS[m.provider || ''] || { color: 'var(--primary)', short: 'AI' };
                const discount = Math.round((1 - (ourPrice(m.offIn) / openrouterPrice(m.offIn))) * 100);
                
                return (
                  <div className="spotlight-card fade-in-up" key={i} style={{ animationDelay: `${i * 0.15}s` }}>
                    <div>
                      {/* Logo and Provider Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '10px', 
                            background: p.logo ? 'transparent' : `${p.color}15`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {p.logo ? (
                              <img src={p.logo} alt={m.provider} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ color: p.color, fontWeight: 900, fontSize: '0.8rem' }}>{p.short}</span>
                            )}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text)' }}>{m.name}</h3>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.provider}</span>
                          </div>
                        </div>
                        <span className="save-tag" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--green)', fontSize: '0.65rem' }}>
                          -{discount || GLOBAL_SAVING}%
                        </span>
                      </div>

                      {/* Side-by-Side In/Out Pricing Comparison */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-alt)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Input Tokens (per 1M)</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--green)', fontWeight: 800, fontFamily: 'var(--mono)' }}>${ourPrice(m.offIn).toFixed(3)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through', fontFamily: 'var(--mono)' }}>${openrouterPrice(m.offIn).toFixed(3)}</span>
                          </div>
                        </div>
                        <div style={{ height: '1px', background: 'var(--border-light)' }} />
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Output Tokens (per 1M)</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--green)', fontWeight: 800, fontFamily: 'var(--mono)' }}>${ourPrice(m.offOut).toFixed(3)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through', fontFamily: 'var(--mono)' }}>${openrouterPrice(m.offOut).toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link to="/dashboard" className="btn-solid" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}>
                      Deploy Model <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════
         DETAILED PRICING MATRIX (TABLE)
         ════════════════════════════════════ */}
      <section id="rates-table" className="section section-alt" style={{ padding: '6rem 0', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="section-title">
            <h2>Detailed Price comparison matrix</h2>
            <p>Compare real-time rates of all active models inside our ecosystem</p>
          </div>

          {/* Table Search Input */}
          <div className="pricing-search-wrapper">
            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6, zIndex: 12 }} />
            <input 
              type="text" 
              placeholder="Search by model name or provider (e.g. Gemini, Opus)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pricing-search-input"
            />
          </div>

          <div className="pricing-table-premium" style={{ backdropFilter: 'blur(20px)', background: 'var(--surface)' }}>
            <div className="pt-header">
              <div className="pt-col model">Model Name</div>
              <div className="pt-col price">Input / 1M</div>
              <div className="pt-col price">Output / 1M</div>
              <div className="pt-col savings">Discount</div>
            </div>
            
            <div className="pt-body">
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto' }} />
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="models-empty">
                  <h3>No active neural pathways matched</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Try refining your query or search term.</p>
                </div>
              ) : (
                filteredModels.slice(0, 15).map((m, i) => {
                  if (!m) return null;
                  const p = PROVIDERS[m.provider || ''] || { color: 'var(--primary)', short: 'AI' };
                  const discount = Math.round((1 - (ourPrice(m.offIn) / openrouterPrice(m.offIn))) * 100);
                  
                  return (
                    <div className="pt-row" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="pt-col model">
                        <div className="model-info">
                          {/* Dynamic Brand Logo inside Table Row */}
                          <div style={{ 
                            width: '20px', height: '20px', borderRadius: '4px', 
                            background: p.logo ? 'transparent' : `${p.color}15`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', flexShrink: 0
                          }}>
                            {p.logo ? (
                              <img src={p.logo} alt={m.provider} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ color: p.color, fontWeight: 900, fontSize: '0.55rem' }}>{p.short}</span>
                            )}
                          </div>
                          <span className="m-name">{m.name}</span>
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', 
                            padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--bg-alt)', 
                            color: 'var(--text-dim)', letterSpacing: '0.5px' 
                          }}>
                            {m.provider}
                          </span>
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
                        <span className="s-badge">-{discount || GLOBAL_SAVING}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link to="/models" className="btn-outline btn-lg">
              Explore All 260+ Active Models <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
         BENEFITS & FAQ SECTIONS
         ════════════════════════════════════ */}
      <section className="section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="section-title">
            <h2>Why developers build here</h2>
            <p>Elite infrastructure optimized for speed, security, and raw pricing volume</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <DollarSign size={24} />,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                title: 'Pure Pay-As-You-Go',
                desc: 'Sem mensalidades fixas. Faturação em milissegundos cobrada de acordo com o consumo real de tokens das suas aplicações.',
                highlight: 'Granularidade pura'
              },
              {
                icon: <Clock size={24} />,
                color: '#6366f1',
                bg: 'rgba(99,102,241,0.08)',
                title: 'Saldo Sem Expiração',
                desc: 'Ao contrário de provedores tradicionais que limpam os créditos não utilizados ao final do mês, o teu saldo Digitaland fica no teu Vault para sempre.',
                highlight: 'Ativo permanente'
              },
              {
                icon: <Shield size={24} />,
                color: '#f59e0b',
                bg: 'rgba(245,158,11,0.08)',
                title: 'SLA de Alta Disponibilidade',
                desc: 'Redundância multi-região Edge garantindo 99.9% de uptime para o processamento de cargas de trabalho críticas em produção.',
                highlight: 'Grau empresarial'
              }
            ].map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.highlight && <span className="feature-highlight">{f.highlight}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="section section-alt" style={{ padding: '6rem 0', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="section-title">
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {FAQ_DATA.map((f, i) => (
              <div className="faq-item" key={i} style={{ border: '1px solid var(--border)' }}>
                <button className="faq-trigger" onClick={() => toggleFaq(i)} style={{ outline: 'none' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{f.q}</span>
                  <ChevronDown size={18} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--primary)' }} />
                </button>
                {openFaq === i && (
                  <div className="faq-content" style={{ fontSize: '0.92rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', color: 'var(--text-dim)', lineHeight: 1.7 }}>
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
