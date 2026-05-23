import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDynamicModels, PROVIDERS, ourPrice, savingsPercent } from '../data/models';
import { 
  Search, Copy, Check, ChevronDown, X, Loader2, ArrowUpRight, 
  Sparkles, Cpu, Info, Database 
} from 'lucide-react';

const DISCOUNT = savingsPercent();

const TYPE_ICONS = {
  Chat: '💬', Reasoning: '🧠', Code: '💻', Vision: '👁️', Image: '🎨',
  Audio: '🎵', Video: '🎬', Search: '🔍', Embedding: '📐', MoE: '🔀',
};

// Advanced model details helper to dynamically map context window, max output, and professional persuasive descriptions
const getModelSpecs = (m) => {
  if (!m) return { context: '—', maxOutput: '—', desc: '' };
  const name = (m.name || '').toLowerCase();
  const provider = m.provider || 'Other';
  const isGeneration = ['Image', 'Video', 'Audio'].includes(m.type || '');

  let context = '128K';
  let maxOutput = '4K';
  let desc = '';

  // Determine context
  if (isGeneration) {
    context = '—';
    maxOutput = '—';
  } else if (name.includes('gemini-3') || name.includes('gemini-2') || name.includes('gemini-1.5')) {
    context = '1M';
    maxOutput = '8K';
  } else if (name.includes('claude')) {
    context = '200K';
    maxOutput = name.includes('opus') ? '4K' : '8K';
  } else if (name.includes('gpt-5') || name.includes('gpt-4o') || name.includes('o1') || name.includes('o3')) {
    context = '128K';
    maxOutput = name.includes('o1') || name.includes('o3') ? '64K' : '16K';
  } else if (name.includes('deepseek-r1')) {
    context = '128K';
    maxOutput = '8K';
  } else if (name.includes('llama-3.3') || name.includes('llama-3.1')) {
    context = '128K';
    maxOutput = '8K';
  } else if (name.includes('qwen3')) {
    context = '32K';
    maxOutput = '8K';
  } else if (name.includes('doubao')) {
    context = '128K';
    maxOutput = '8K';
  }

  // Persuasive description map
  const descMap = {
    'gpt-4o-mini': 'Screaming fast, highly affordable intelligence. Perfect for large-scale operations, real-time agent workflows, and budget-friendly pipelines.',
    'gpt-4o': 'OpenAI\'s premier flagship model. Unmatched versatility, rapid speed, and top-tier intelligence for mission-critical enterprise automation.',
    'claude-sonnet-4-6': 'Anthropic\'s gold standard. Renowned for elite coding proficiency, deep contextual comprehension, and rich multi-step reasoning capabilities.',
    'claude-haiku-4-5': 'The speed champion of Anthropic. Delivers premium enterprise reasoning at ultra-low latency and minimal resource footprint.',
    'deepseek-r1': 'The open-source reasoning marvel. Leverages advanced chain-of-thought processing to solve extremely complex math, code, and logic hurdles.',
    'deepseek-v3': 'Next-generation Mixture-of-Experts (MoE) foundation model. High-fidelity responses with exceptional speed and industry-disrupting value.',
    'llama-3.3-70b': 'Meta\'s state-of-the-art open weight model. Exceptional contextual reasoning, deep multilingual support, and premium analytical power.',
    'gemini-3-flash': 'Google\'s multi-modal speedster. Extremely wide 1-Million token context window for processing massive datasets, codebases, and audio files at high speed.',
    'nano-banana': 'Digitaland\'s exclusive hyper-affordable image model. Blazing fast, premium 3D renders, and vivid color generations at a fraction of a cent.',
    'qwen-image-2.0': 'Alibaba\'s powerhouse image generation core. Exceptional photorealism, precise text rendering, and gorgeous color harmony.',
    'doubao-seedream-5-0': 'ByteDance\'s premium creative engine. Incredible texture details, highly stylistic concepts, and flawless prompt compliance.',
    'dall-e-3': 'OpenAI\'s legendary artistic standard. Flawless layout mapping, strict prompt alignment, and stunning studio-quality web assets.',
  };

  // Find partial matches in descriptions
  const matchedKey = Object.keys(descMap).find(k => name.includes(k));
  if (matchedKey) {
    desc = descMap[matchedKey];
  } else {
    // Highly persuasive fallbacks
    if (isGeneration) {
      desc = `Creative state-of-the-art ${m.type} model by ${provider}. Generates premium studio-grade ${m.type.toLowerCase()} outputs from complex text descriptions with perfect compliance.`;
    } else if (m.reasoning) {
      desc = `Elite ${provider} reasoning architecture. Performs advanced reasoning, deep logical synthesis, and mathematical proofs via massive parallel chain-of-thought analysis.`;
    } else if (m.badge === 'Flagship') {
      desc = `Flagship ${provider} model designed for ultimate reasoning, complex contextual understanding, and maximum precision across high-fidelity workflows.`;
    } else if (m.badge === 'Budget' || m.badge === 'Value') {
      desc = `Highly efficient, speed-optimized ${provider} core. Excels at high-volume classification, extraction, and real-time response generation with great savings.`;
    } else {
      desc = `High-fidelity ${provider} AI model. Fully fine-tuned for versatile operations, premium accuracy, and robust logical inference across multi-industry tasks.`;
    }
  }

  return { context, maxOutput, desc };
};

export default function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selProvider, setSelProvider] = useState('All');
  const [selType, setSelType] = useState('All');
  const [copied, setCopied] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    getDynamicModels()
      .then(data => {
        setModels(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load models:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  // Keyboard shortcut listener to focus search (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const providers = useMemo(() => {
    const list = new Set();
    models.forEach(m => { if (m.provider) list.add(m.provider); });
    return Array.from(list).sort();
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter(m => {
      if (!m) return false;
      const q = search ? search.toLowerCase() : '';
      const nameLower = (m.name || '').toLowerCase();
      const providerLower = (m.provider || '').toLowerCase();
      const typeLower = (m.type || '').toLowerCase();

      const matchSearch = !q 
        || nameLower.includes(q) 
        || providerLower.includes(q) 
        || typeLower.includes(q);
      
      const matchProvider = selProvider === 'All' || m.provider === selProvider;
      
      let matchType = true;
      if (selType !== 'All') {
        if (selType === 'Featured') {
          matchType = m.badge === 'Flagship' || m.badge === 'Popular';
        } else if (selType === 'LLM') {
          matchType = m.type === 'Chat' || m.type === 'Reasoning' || m.type === 'Code';
        } else {
          matchType = m.type === selType;
        }
      }
      return matchSearch && matchProvider && matchType;
    });
  }, [models, search, selProvider, selType]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const resetFilters = () => {
    setSearch('');
    setSelProvider('All');
    setSelType('All');
  };

  return (
    <main className="models-premium-page">
      {/* 1. HERO HEADER SECTION */}
      <section className="models-premium-hero">
        <div className="mesh-bg">
          <div className="mesh-blob blob-1" />
          <div className="mesh-blob blob-2" />
        </div>
        <div className="container hero-container">
          <div className="badge-glow-wrap fade-in-up">
            <span className="premium-glow-badge">
              <Sparkles size={12} style={{ color: 'var(--primary)' }} />
              270+ High-Performance Nodes Online
            </span>
          </div>
          
          <h1 className="hero-main-title fade-in-up delay-1">
            State-of-the-Art <br />
            <span className="gradient-text">AI Model Library</span>
          </h1>
          
          <p className="hero-subtitle fade-in-up delay-2">
            One single, blazing-fast API to run inference on the world\'s leading open-source and proprietary architectures. 
            Deployed in milliseconds, billed atomically with up to 40% custom markup discounts.
          </p>

          {/* Centralized Premium Search Bar */}
          <div className="hero-search-wrapper fade-in-up delay-3">
            <Search size={20} className="search-icon-left" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by model, developer, type, or provider..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-box"
            />
            {search ? (
              <button className="search-clear-btn" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            ) : (
              <div className="search-shortcut-pill">
                <span>/</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. HORIZONTAL PREMIUM FILTERS BAR */}
      <section className="filters-bar-section">
        <div className="container">
          <div className="filters-bar-inner">
            {/* Category tabs */}
            <div className="filters-tabs-group">
              {[
                { id: 'All', label: 'All Models' },
                { id: 'Featured', label: 'Featured 🔥' },
                { id: 'LLM', label: 'Language & LLMs 💬' },
                { id: 'Image', label: 'Images 🎨' },
                { id: 'Video', label: 'Videos 🎬' },
                { id: 'Audio', label: 'Audio 🎵' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelType(tab.id)}
                  className={`filter-tab-btn ${selType === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Selector group (Right) */}
            <div className="filters-selects-group">
              {/* Provider select wrapper */}
              <div className="select-wrapper">
                <span className="select-label">Provider:</span>
                <select
                  value={selProvider}
                  onChange={e => setSelProvider(e.target.value)}
                  className="premium-filter-select"
                >
                  <option value="All">All Providers ({providers.length})</option>
                  {providers.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>

              {/* Total indicator */}
              <div className="total-badge-indicator">
                <Database size={13} />
                <span>{filtered.length} Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PREMIUM GRID AREA */}
      <section className="models-premium-grid-area">
        <div className="container">
          {error ? (
            <div className="premium-empty-state" style={{ padding: '4rem 2rem', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.02)' }}>
              <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</span>
              <h3 style={{ color: '#ef4444' }}>Ligação à Base de Dados Falhou</h3>
              <p style={{ maxWidth: '460px', margin: '0.5rem auto 1.5rem', color: 'var(--text-muted)' }}>
                Não foi possível estabelecer ligação com o servidor da base de dados Digitaland. Por favor, tente recarregar a página.
              </p>
              <button className="btn-glow-primary" onClick={() => window.location.reload()}>Tentar Novamente</button>
            </div>
          ) : loading ? (
            <div className="premium-loader-wrap">
              <Loader2 size={40} className="animate-spin loader-spinner" />
              <h3>Sincronizando com a Matriz Neural...</h3>
              <p>Carregando os preços, descrições e benchmarks de mais de 270 modelos ativos no Supabase.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="premium-empty-state">
              <Info size={48} className="empty-state-icon" />
              <h3>Nenhum modelo neural encontrado</h3>
              <p>Não encontramos modelos que correspondam à sua pesquisa atual. Tente alterar os filtros ou limpar a pesquisa.</p>
              <button onClick={resetFilters} className="btn-glow-primary">
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="models-premium-grid">
              {filtered.map((m) => {
                if (!m) return null;
                const prov = PROVIDERS[m.provider || ''] || { color: '#6366f1', short: m.provider?.[0] || 'N' };
                const ourIn = ourPrice(m.offIn || 0);
                const ourOut = ourPrice(m.offOut || 0);
                const isGeneration = ['Image', 'Video', 'Audio'].includes(m.type || '');
                const { context, maxOutput, desc } = getModelSpecs(m);

                // Set custom variables for hover glowing effects
                const brandColor = prov.color;
                const brandGlow = prov.color + '1a'; // 10% opacity hex
                const brandGlowStrong = prov.color + '33'; // 20% opacity hex

                return (
                  <div 
                    className="premium-model-card" 
                    key={m.id}
                    style={{
                      '--brand-color': brandColor,
                      '--brand-glow': brandGlow,
                      '--brand-glow-strong': brandGlowStrong,
                      borderTop: `4px solid ${brandColor}`
                    }}
                  >
                    {/* Badge at the top corner if present */}
                    {m.badge && (
                      <div className={`model-card-corner-badge badge-${m.badge.toLowerCase()}`}>
                        {m.badge}
                      </div>
                    )}

                    {/* Header info */}
                    <div className="pm-card-header">
                      {m.provider === 'DeepSeek' ? (
                        <img src="/deepseek-logo.png" alt="DeepSeek" className="pm-provider-avatar" style={{ width: '42px', height: '42px', objectFit: 'contain', background: '#ffffff', padding: '5px' }} />
                      ) : m.provider === 'Alibaba' || (m.name || '').toLowerCase().includes('qwen') ? (
                        <img src="/qwen-logo.png" alt="Qwen" className="pm-provider-avatar" style={{ width: '42px', height: '42px', objectFit: 'contain', background: '#ffffff', padding: '5px' }} />
                      ) : (
                        <div className="pm-provider-avatar" style={{ background: `${brandColor}12`, color: brandColor }}>
                          {prov.short}
                        </div>
                      )}
                      <div className="pm-provider-meta">
                        <div className="pm-provider-name">{m.provider}</div>
                        <h3 className="pm-model-name" title={m.name}>{m.name}</h3>
                      </div>
                      <div className="pm-type-badge">
                        <span>{TYPE_ICONS[m.type] || '🤖'} {m.type}</span>
                      </div>
                    </div>

                    {/* Description section */}
                    <p className="pm-model-desc">{desc}</p>

                    {/* Specifications table */}
                    <div className="pm-model-specs-grid">
                      <div className="pm-spec-item">
                        <span className="pm-spec-label">Contexto</span>
                        <span className="pm-spec-value">{context}</span>
                      </div>
                      <div className="pm-spec-item">
                        <span className="pm-spec-label">Output Míx.</span>
                        <span className="pm-spec-value">{maxOutput}</span>
                      </div>
                      <div className="pm-spec-item span-2">
                        <span className="pm-spec-label">Economia vs Upstream</span>
                        <span className="pm-spec-value text-green">-{DISCOUNT}%</span>
                      </div>
                    </div>

                    {/* Pricing Display box */}
                    <div className="pm-pricing-box">
                      {isGeneration ? (
                        <div className="pm-pricing-line">
                          <span className="pricing-label">CUSTO POR GERAÇÃO</span>
                          <div className="pricing-value-wrap">
                            <span className="pricing-value">${ourIn.toFixed(4)}</span>
                            <span className="pricing-unit">/ gen</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="pm-pricing-line">
                            <span className="pricing-label">INPUT (Prompt)</span>
                            <div className="pricing-value-wrap">
                              <span className="pricing-value">${ourIn.toFixed(4)}</span>
                              <span className="pricing-unit">/ 1M tokens</span>
                            </div>
                          </div>
                          <div className="pm-pricing-line">
                            <span className="pricing-label">OUTPUT (Completions)</span>
                            <div className="pricing-value-wrap">
                              <span className="pricing-value">${ourOut.toFixed(4)}</span>
                              <span className="pricing-unit">/ 1M tokens</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pm-card-actions">
                      <button
                        onClick={() => handleCopy(m.name, m.id)}
                        className={`pm-action-btn-secondary ${copied === m.id ? 'copied' : ''}`}
                        title="Copy Model ID to Clipboard"
                      >
                        {copied === m.id ? (
                          <>
                            <Check size={14} />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>

                      <Link 
                        to={`/playground?model=${m.id}`} 
                        className="pm-action-btn-primary"
                        style={{ background: brandColor }}
                      >
                        <span>Try Node</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
