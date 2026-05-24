import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDynamicModels, PROVIDERS, ourPrice, openrouterPrice, savingsPercent } from '../data/models';
import { 
  ArrowRight, ChevronDown, CheckCircle2, Shield, 
  DollarSign, Clock, Loader2, Search, Info
} from 'lucide-react';
import ProviderLogo from '../components/ProviderLogo';

const GLOBAL_SAVING = savingsPercent();

const ALL_FALLBACK_MODELS = [
    // DeepSeek
    { id: 'deepseek-v3-pro', name: 'DeepSeek-V3-Pro', provider: 'DeepSeek', type: 'Chat', offIn: 0.814, offOut: 2.486, badge: 'Flagship' },
    { id: 'deepseek-v3-flash', name: 'DeepSeek-V3-Flash', provider: 'DeepSeek', type: 'Chat', offIn: 0.10, offOut: 0.20, badge: 'Value' },
    { id: 'deepseek-v3.2', name: 'DeepSeek-V3.2', provider: 'DeepSeek', type: 'Chat', offIn: 0.507, offOut: 0.336, badge: '' },
    { id: 'deepseek-v3.2-exp', name: 'DeepSeek-V3.2-Exp', provider: 'DeepSeek', type: 'Chat', offIn: 0.507, offOut: 0.293, badge: '' },
    { id: 'deepseek-v3.2-terminus', name: 'DeepSeek-V3.2-Terminus', provider: 'DeepSeek', type: 'Chat', offIn: 0.507, offOut: 0.714, badge: '' },
    { id: 'deepseek-r1', name: 'DeepSeek-R1', provider: 'DeepSeek', type: 'Reasoning', offIn: 0.393, offOut: 1.564, badge: 'Flagship' },

    // Qwen
    { id: 'qwen-2-5-72b', name: 'Qwen-2.5-72B', provider: 'Qwen', type: 'Chat', offIn: 0.214, offOut: 2.643, badge: 'Flagship' },
    { id: 'qwen-2-5-32b-a23b', name: 'Qwen-2.5-32B-A23B', provider: 'Qwen', type: 'Chat', offIn: 0.50, offOut: 1.143, badge: '' },
    { id: 'qwen-2-5-14b', name: 'Qwen-2.5-14B', provider: 'Qwen', type: 'Chat', offIn: 0.0714, offOut: 0.529, badge: 'Value' },
    { id: 'qwen-2-5-72b-a14b', name: 'Qwen-2.5-72B-A14B', provider: 'Qwen', type: 'Chat', offIn: 0.136, offOut: 0.421, badge: 'Popular' },
    { id: 'qwen-2-5-27b', name: 'Qwen-2.5-27B', provider: 'Qwen', type: 'Chat', offIn: 0.529, offOut: 5.214, badge: '' },

    // Zhipu (Zai)
    { id: 'glm-4-1', name: 'GLM-4.1', provider: 'Zhipu', type: 'Chat', offIn: 1.00, offOut: 3.143, badge: 'Flagship' },
    { id: 'glm-4', name: 'GLM-4', provider: 'Zhipu', type: 'Chat', offIn: 0.257, offOut: 1.886, badge: '' },
    { id: 'glm-4-7', name: 'GLM-4.7', provider: 'Zhipu', type: 'Chat', offIn: 0.30, offOut: 2.643, badge: 'Popular' },
    { id: 'glm-4-8v', name: 'GLM-4.8V', provider: 'Zhipu', type: 'Chat', offIn: 0.143, offOut: 0.20, badge: 'Value' },
    { id: 'glm-4-9', name: 'GLM-4.9', provider: 'Zhipu', type: 'Chat', offIn: 0.271, offOut: 0.929, badge: '' },

    // Moonshot AI
    { id: 'kimi-k1-instruct', name: 'Kimi-k1-instruct', provider: 'Moonshot', type: 'Chat', offIn: 0.343, offOut: 1.986, badge: 'Popular' },
    { id: 'kimi-k1-instruct-osds', name: 'Kimi-k1-instruct-OSDS', provider: 'Moonshot', type: 'Chat', offIn: 1.714, offOut: 5.00, badge: 'Flagship' },
    { id: 'kimi-k1-5', name: 'Kimi-k1.5', provider: 'Moonshot', type: 'Chat', offIn: 0.293, offOut: 1.257, badge: '' },
    { id: 'kimi-k1-6', name: 'Kimi-k1.6', provider: 'Moonshot', type: 'Chat', offIn: 0.214, offOut: 1.143, badge: '' },

    // MiniMax AI
    { id: 'minimax-v2-5', name: 'MiniMax-V2.5', provider: 'MiniMax', type: 'Chat', offIn: 0.214, offOut: 1.214, badge: 'Flagship' },

    // OpenAI
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini', provider: 'OpenAI', type: 'Chat', offIn: 0.107, offOut: 0.429, badge: 'Value' },
    { id: 'gpt-4o', name: 'gpt-4o', provider: 'OpenAI', type: 'Chat', offIn: 1.786, offOut: 7.143, badge: 'Flagship' },
    { id: 'o1-mini', name: 'o1-mini', provider: 'OpenAI', type: 'Reasoning', offIn: 2.143, offOut: 8.571, badge: 'Popular' },
    { id: 'o1', name: 'o1', provider: 'OpenAI', type: 'Reasoning', offIn: 10.714, offOut: 42.857, badge: 'Flagship' },

    // Anthropic
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', type: 'Chat', offIn: 2.143, offOut: 10.714, badge: 'Flagship' },
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', type: 'Chat', offIn: 0.571, offOut: 2.857, badge: 'Value' },

    // Google
    { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', type: 'Chat', offIn: 0.893, offOut: 3.571, badge: 'Flagship' },
    { id: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', type: 'Chat', offIn: 0.0536, offOut: 0.214, badge: 'Value' },

    // Others
    { id: 'deepseek-v2-lite-1b', name: 'DeepSeek-V2-Lite-1B', provider: 'Meta', type: 'Chat', offIn: 0.193, offOut: 0.714, badge: '' },
    { id: 'gemini-1-5-flash-8b', name: 'gemini-1.5-flash-8b', provider: 'Google', type: 'Chat', offIn: 0.0714, offOut: 0.286, badge: 'Value' },
    { id: 'gemini-1-5-pro-8b', name: 'gemini-1.5-pro-8b', provider: 'Google', type: 'Chat', offIn: 0.093, offOut: 0.286, badge: '' },
    { id: 'phi-3-medium-instruct', name: 'Phi-3-medium-instruct', provider: 'Other', type: 'Chat', offIn: 0.10, offOut: 0.479, badge: '' },
    { id: 'yi-1-5-34b-chat', name: 'Yi-1.5-34b-Chat', provider: 'Other', type: 'Chat', offIn: 0.061, offOut: 0.543, badge: '' },

    // Image Generation
    { id: 'flux-schnell-gen', name: 'FLUX.1 [schnell]', provider: 'Stability AI', type: 'Image', offIn: 0.0214, offOut: 0, badge: 'Value' },
    { id: 'flux-dev-gen', name: 'FLUX.1 [dev]', provider: 'Stability AI', type: 'Image', offIn: 0.0536, offOut: 0, badge: 'Popular' },
    { id: 'flux-schnell-max', name: 'FLUX.1 [schnell] (max)', provider: 'Stability AI', type: 'Image', offIn: 0.0429, offOut: 0, badge: '' },
    { id: 'flux-dev-ultra', name: 'FLUX.1 [dev] (ultra)', provider: 'Stability AI', type: 'Image', offIn: 0.0571, offOut: 0, badge: '' },
    { id: 'flux-schnell-ultra', name: 'FLUX.1 [schnell] (ultra)', provider: 'Stability AI', type: 'Image', offIn: 0.0429, offOut: 0, badge: '' },

    // Video Generation
    { id: 'luma-dream-gen', name: 'Luma Dream Machine', provider: 'Other', type: 'Video', offIn: 0.2143, offOut: 0, badge: 'Popular' },
    { id: 'sora-video-gen', name: 'Sora Video', provider: 'OpenAI', type: 'Video', offIn: 1.0714, offOut: 0, badge: 'Flagship' },

    // Audio Models
    { id: 'whisper-large-v3-gen', name: 'Whisper Large V3', provider: 'OpenAI', type: 'Audio', offIn: 0.00428, offOut: 0, badge: 'Flagship' },
    { id: 'elevenlabs-reader-gen', name: 'ElevenLabs Reader', provider: 'Other', type: 'Audio', offIn: 0.01071, offOut: 0, badge: 'Popular' }
];

const PROVIDER_DESCS = {
  DeepSeek: "DeepSeek released the first open weight model and has gained global attention for its highly capable, cost efficient LLMs. Models such as DeepSeek-V3 and DeepSeek-R1 are competitive with top international models, delivering remarkable performance in reasoning, coding, and mathematical problem solving.",
  Qwen: "Open source & model family built by Alibaba Cloud ranging from 0.5B to 120B+ parameters, designed to scale to any use case, from deep reasoning and math to autonomous coding.",
  Zhipu: "Zhipu AI builds the ChatGLM family of LLMs, developer APIs and Agents. Their latest model, GLM-4, delivers frontier-level performance in coding, creative writing, and roleplay scenarios.",
  Moonshot: "Moonshot AI stands out for breakthroughs in long-context language models. Its flagship product, Kimi, is especially well-suited for research, legal work, and complex information synthesis. The latest release, Kimi k1 Thinking, is a state-of-the-art thinking agent with deep reasoning and tool orchestration.",
  MiniMax: "Specialized in multimodal capabilities, MiniMax develops advanced models that seamlessly integrate text, voice, and vision, with notable achievements in natural-sounding text-to-speech and voice cloning.",
  OpenAI: "OpenAI is a pioneering AI research organization that helped spark today's generative AI revolution. Its GPT series brought LLMs into the mainstream and is currently led by GPT-4 and o1, which set industry benchmarks for natural language understanding, generation, and reasoning.",
  Anthropic: "Anthropic is a public benefit corporation focused on building safe and alignment-optimized neural architectures. Its Claude family sets the industry benchmark for precise coding, reasoning, and context window comprehension.",
  Google: "Google Gemini represents the cutting edge of native multimodal intelligence. Offering extremely large context windows, Gemini excel at processing millions of tokens of code, video, and audio.",
  Others: "Robust foundation and specialized open-weight models from leading AI houses (Meta, Cohere, Mistral). Perfect for fine-tuned enterprise classification, summarization, and cost-effective operations.",
  Image: "Generate high-quality images from text prompts with our state-of-the-art image generation models.",
  Video: "Create dynamic videos from text descriptions with our cutting-edge video generation models.",
  Audio: "Process and generate audio with our high-quality speech recognition and synthesis models."
};

const getModelSpecs = (m) => {
  if (!m) return { context: '—' };
  const name = (m.name || '').toLowerCase();
  const isGeneration = ['Image', 'Video', 'Audio'].includes(m.type || '');

  let context = '128K';
  if (isGeneration) {
    context = '—';
  } else if (name.includes('gemini')) {
    context = '1M';
  } else if (name.includes('claude')) {
    context = '200K';
  } else if (name.includes('gpt-4') || name.includes('gpt-5') || name.includes('o1') || name.includes('o3') || name.includes('deepseek') || name.includes('llama')) {
    context = '128K';
  } else if (name.includes('qwen')) {
    context = '32K';
  } else if (name.includes('glm')) {
    context = '128K';
  } else if (name.includes('kimi')) {
    context = '200K';
  }

  return { context };
};

const getCachedInputPrice = (m, ourIn) => {
  if (!m) return null;
  const name = (m.name || '').toLowerCase();
  const provider = (m.provider || '').toLowerCase();
  if (name.includes('deepseek') || provider.includes('deepseek')) {
    return ourIn * 0.04; // extreme discount mapping for DeepSeek ($0.046 for $1.14 input)
  }
  if (name.includes('gpt-4o') || name.includes('gpt-mini') || name.includes('claude') || name.includes('gemini') || name.includes('qwen') || provider.includes('qwen') || name.includes('glm')) {
    return ourIn * 0.50; // standard 50% discount for mainstream models
  }
  return null;
};

const useGroupedData = (models, query) => {
  return useMemo(() => {
    const listToUse = (models && models.length > 0) ? models : ALL_FALLBACK_MODELS;
    
    const filtered = listToUse.filter(m => {
      if (!m) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      const name = (m.name || '').toLowerCase();
      const provider = (m.provider || '').toLowerCase();
      const type = (m.type || '').toLowerCase();
      return name.includes(q) || provider.includes(q) || type.includes(q);
    });

    const groups = {};
    filtered.forEach(m => {
      if (!m) return;
      const isMedia = ['Image', 'Video', 'Audio'].includes(m.type || '');
      const groupKey = isMedia ? m.type : m.provider;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(m);
    });

    return groups;
  }, [models, query]);
};

export default function Pricing() {
  const [models, setModels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Savings Calculator State
  const [tokenVolume, setTokenVolume] = useState(25); // Default: 25M tokens/month
  const [selectedTier, setSelectedTier] = useState('flagship'); // mini | flagship | sonnet
  const [expandedGroups, setExpandedGroups] = useState({});
  const groupedData = useGroupedData(models, searchQuery);

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    getDynamicModels()
      .then(data => {
        setModels(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load pricing models:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  const featuredModels = useMemo(() => {
    // Select top flagship models for the spotlight cards
    if (!models || models.length === 0) {
      return [
        { name: 'GPT-4o', provider: 'OpenAI', badge: 'Flagship', offIn: 2.50, offOut: 10.00 },
        { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Popular', offIn: 3.00, offOut: 15.00 },
        { name: 'Gemini 1.5 Pro', provider: 'Google', badge: 'Flagship', offIn: 1.25, offOut: 5.00 }
      ];
    }
    return models.filter(m => m.badge === 'Flagship' || m.badge === 'Popular').slice(0, 3);
  }, [models]);

  // Find model for calculator comparison dynamically
  const calcModel = useMemo(() => {
    const activeModels = (models && models.length > 0) ? models : [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', offIn: 0.15, offOut: 0.60 },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', offIn: 2.50, offOut: 10.00 },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', offIn: 3.00, offOut: 15.00 }
    ];
    if (selectedTier === 'mini') {
      return activeModels.find(m => m?.id?.includes('mini') || m?.name?.toLowerCase()?.includes('mini')) || activeModels[0];
    }
    if (selectedTier === 'sonnet') {
      return activeModels.find(m => m?.id?.includes('sonnet') || m?.name?.toLowerCase()?.includes('sonnet') || m?.name?.toLowerCase()?.includes('opus')) || activeModels[0];
    }
    return activeModels.find(m => m?.id === 'gpt-4o' || (m?.name?.toLowerCase()?.includes('4o') && !m?.name?.toLowerCase()?.includes('mini'))) || activeModels.find(m => m?.badge === 'Flagship') || activeModels[0];
  }, [models, selectedTier]);

  // Compute calculated pricing
  const calculatorCosts = useMemo(() => {
    if (!calcModel) return { ours: 0, official: 0, saved: 0, pct: 0 };
    const offInVal = calcModel.offIn || 0;
    const oursVal = ourPrice(offInVal) * tokenVolume;
    const officialVal = openrouterPrice(offInVal) * tokenVolume;
    const savedVal = Math.max(officialVal - oursVal, 0);
    const denominator = openrouterPrice(offInVal);
    const pctVal = denominator ? Math.round((1 - (ourPrice(offInVal) / denominator)) * 100) : GLOBAL_SAVING;
    return {
      ours: oursVal,
      official: officialVal,
      saved: savedVal,
      pct: isNaN(pctVal) ? GLOBAL_SAVING : pctVal
    };
  }, [calcModel, tokenVolume]);

// Nested configurations removed and resolved globally at module scope.

  /* ══════════════════════════════════════════════════════════════════════════
     PRICING ROW — no OpenRouter column, no free-catalog data
     ══════════════════════════════════════════════════════════════════════════ */
  // Legacy components PricingRow and PricingCard removed to satisfy strict compilation and clean up codebase

  /* ══════════════════════════════════════════════════════════════════════════
     FAQ
     ══════════════════════════════════════════════════════════════════════════ */
  const FAQ_DATA = [
    { q: 'O que é o Digitaland.ai?', a: 'O Digitaland.ai é um gateway API unificado para inteligência artificial. Oferecemos acesso ultra-rápido a mais de 300 modelos de ponta (OpenAI, Anthropic, Google, xAI, Meta, Mistral) através de uma única integração simples.' },
    { q: 'Como funciona a faturação em tempo real (Pay-As-You-Go)?', a: `Não existem taxas mensais nem subscrições. Adiciona créditos ao teu saldo e os tokens são debitados em tempo real à medida que fazes requisições. As nossas tarifas são garantidamente 30% mais baratas que a OpenRouter.` },
    { q: 'Existe algum compromisso de consumo mínimo?', a: 'Nenhum. Podes testar com apenas $1 e os teus créditos nunca expiram. Pagas apenas pelos tokens que a tua aplicação realmente consome.' },
    { q: 'Como garantem preços mais baixos que a OpenRouter?', a: 'Graças ao nosso motor de routing inteligente global e parcerias de alto volume de processamento, conseguimos otimizar a latência e repassar as economias diretamente para os programadores.' },
  ];

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════════ */
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
            <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          ) : (
            <div className="pricing-spotlight-grid">
              {featuredModels.map((m, i) => {
                if (!m) return null;
                const p = PROVIDERS[m.provider || ''] || { color: 'var(--primary)', short: 'AI' };
                const offInVal = m.offIn || 0;
                const denominator = openrouterPrice(offInVal);
                const discount = denominator ? Math.round((1 - (ourPrice(offInVal) / denominator)) * 100) : GLOBAL_SAVING;
                
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
          <div className="section-title" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', textTransform: 'none' }}>Serverless Pricing</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              Flexible token pricing, high usage limits, and postpaid billing—plus $1 in free credits to get you started!
            </p>
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

          <div className="pricing-grouped-dashboard">
            {error ? (
              <div className="models-empty" style={{ padding: '6rem 2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <Info size={48} style={{ color: '#ef4444', marginBottom: '1.5rem', opacity: 0.8 }} />
                <h3>Erro ao carregar modelos</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto' }}>
                  Não foi possível sincronizar com a Matriz Neural. Por favor, tente novamente mais tarde.
                </p>
              </div>
            ) : loading ? (
              <div style={{ padding: '6rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                <h3 style={{ marginTop: '1.5rem', color: 'var(--text-dim)' }}>Sincronizando com a Matriz Neural...</h3>
              </div>
            ) : Object.keys(groupedData).length === 0 ? (
              <div className="models-empty" style={{ padding: '6rem 2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                <Info size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem', opacity: 0.8 }} />
                <h3>Nenhum modelo neural encontrado</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto' }}>
                  Não encontramos modelos que correspondam ao termo pesquisado. Tente refinar a sua pesquisa.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {Object.entries(groupedData).map(([groupKey, list]) => {
                  const isMedia = ['Image', 'Video', 'Audio'].includes(groupKey);
                  const title = isMedia 
                    ? (groupKey === 'Image' ? 'Image Generation' : groupKey === 'Video' ? 'Video Generation' : 'Audio Models')
                    : (groupKey === 'Zhipu' ? 'Zai' : groupKey === 'Moonshot' ? 'Moonshot AI' : groupKey === 'MiniMax' ? 'MiniMaxAI' : groupKey);
                  
                  const desc = PROVIDER_DESCS[groupKey] || '';
                  const isExpanded = expandedGroups[groupKey];
                  const visibleList = isExpanded ? list : list.slice(0, 5);
                  
                  return (
                    <div className="pricing-split-card fade-in-up" key={groupKey}>
                      {/* Left Column: Brand Info & Pitch */}
                      <div className="pricing-card-left">
                        <div className="provider-logo-brand">
                          {!isMedia ? (
                            <ProviderLogo provider={groupKey} size={36} />
                          ) : (
                            <div className="provider-logo-media" style={{ 
                              width: '36px', height: '36px', borderRadius: '10px', 
                              background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.2rem', fontWeight: 900
                            }}>
                              {groupKey === 'Image' ? '🎨' : groupKey === 'Video' ? '🎬' : '🎵'}
                            </div>
                          )}
                          <h3 className="provider-card-title">{title}</h3>
                        </div>
                        <p className="provider-card-desc">{desc}</p>
                      </div>

                      {/* Right Column: Dynamic Pricing Grid Table */}
                      <div className="pricing-card-right">
                        <div className="pricing-table-wrapper">
                          <table className="pricing-grid-table">
                            <thead>
                              {isMedia ? (
                                <tr>
                                  <th align="left" style={{ textAlign: 'left' }}>Model Name</th>
                                  <th align="right" style={{ textAlign: 'right' }}>
                                    {groupKey === 'Image' ? 'Price / Image' : groupKey === 'Video' ? 'Price / Video' : 'Output (1000 T + Minute)'}
                                  </th>
                                  <th align="center" style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                              ) : (
                                <tr>
                                  <th align="left" style={{ textAlign: 'left' }}>Model Name</th>
                                  <th align="center" style={{ textAlign: 'center' }}>Context Length</th>
                                  <th align="right" style={{ textAlign: 'right' }}>Input / 1M</th>
                                  <th align="right" style={{ textAlign: 'right' }}>Cached Input</th>
                                  <th align="right" style={{ textAlign: 'right' }}>Output / 1M</th>
                                  <th align="center" style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                              )}
                            </thead>
                            <tbody>
                              {visibleList.map((m) => {
                                if (!m) return null;
                                const ourIn = ourPrice(m.offIn || 0);
                                const ourOut = ourPrice(m.offOut || 0);
                                const { context } = getModelSpecs(m);
                                const cachedPrice = getCachedInputPrice(m, ourIn);

                                return (
                                  <tr key={m.id}>
                                    <td className="cell-model-name">
                                      <span>{m.name}</span>
                                    </td>
                                    {isMedia ? (
                                      <>
                                        <td align="right" className="cell-price font-mono" style={{ textAlign: 'right' }}>
                                          ${ourIn.toFixed(4)}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td align="center" className="cell-context" style={{ textAlign: 'center' }}>
                                          {context}
                                        </td>
                                        <td align="right" className="cell-price font-mono" style={{ textAlign: 'right' }}>
                                          ${ourIn.toFixed(3)}
                                        </td>
                                        <td align="right" className="cell-price font-mono text-muted" style={{ textAlign: 'right' }}>
                                          {cachedPrice !== null ? `$${cachedPrice.toFixed(3)}` : '—'}
                                        </td>
                                        <td align="right" className="cell-price font-mono" style={{ textAlign: 'right' }}>
                                          ${ourOut.toFixed(3)}
                                        </td>
                                      </>
                                    )}
                                    <td align="center" className="cell-actions" style={{ textAlign: 'center' }}>
                                      <Link 
                                        to={`/playground?model=${m.id}`}
                                        className="pricing-action-link"
                                      >
                                        Details
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {list.length > 5 && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0' }}>
                            <button 
                              onClick={() => toggleGroupExpand(groupKey)}
                              className="btn-load-more"
                            >
                              {isExpanded ? 'Show Less' : 'Load More'}
                            </button>
                          </div>
                        )}
                        
                        {/* Footer Info inside Right Card */}
                        <div className="pricing-card-footer-info">
                          <CheckCircle2 size={13} className="text-green" />
                          <span>
                            {isMedia 
                              ? (groupKey === 'Image' 
                                  ? 'Prices shown are per image generated or edited.' 
                                  : groupKey === 'Video' 
                                    ? 'Prices shown are per video generated.' 
                                    : 'Prices for transcription and translations are per minute of audio. Text-to-Speech prices are per 1,000 characters.')
                              : 'Prices shown are per 1 million tokens.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

            {/* Custom Embedded Scoped Styling */}
            <style>{`
              .pricing-grouped-dashboard {
                margin-top: 2rem;
                width: 100%;
              }

              .pricing-split-card {
                display: grid;
                grid-template-columns: 280px 1fr;
                gap: 2rem;
                background: rgba(18, 18, 29, 0.45);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 20px;
                padding: 2.25rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.4);
              }

              .pricing-split-card:hover {
                transform: translateY(-2px);
                border-color: rgba(99, 102, 241, 0.2);
                box-shadow: 0 20px 50px -15px rgba(99, 102, 241, 0.1);
              }

              .pricing-card-left {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
              }

              .provider-logo-brand {
                display: flex;
                align-items: center;
                gap: 12px;
              }

              .provider-card-title {
                font-size: 1.4rem;
                font-weight: 800;
                color: var(--text);
                margin: 0;
                letter-spacing: -0.5px;
              }

              .provider-card-desc {
                font-size: 0.85rem;
                line-height: 1.6;
                color: var(--text-dim);
                margin: 0;
              }

              .pricing-card-right {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                min-width: 0;
              }

              .pricing-table-wrapper {
                overflow-x: auto;
                border-radius: 12px;
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.03);
              }

              .pricing-grid-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
              }

              .pricing-grid-table th {
                padding: 0.85rem 1.1rem;
                font-size: 0.68rem;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: var(--text-muted);
                font-weight: 750;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              }

              .pricing-grid-table td {
                padding: 0.9rem 1.1rem;
                font-size: 0.88rem;
                color: var(--text);
                border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                vertical-align: middle;
              }

              .pricing-grid-table tr:last-child td {
                border-bottom: none;
              }

              .cell-model-name {
                font-weight: 700;
                color: var(--text);
              }

              .cell-context {
                font-weight: 700;
                color: var(--text-dim);
                font-size: 0.8rem;
              }

              .cell-price {
                font-weight: 700;
                color: #b085ff;
              }

              .cell-price.text-muted {
                color: var(--text-muted);
                opacity: 0.65;
              }

              .cell-actions {
                font-size: 0.85rem;
              }

              .pricing-action-link {
                color: var(--primary);
                font-weight: 700;
                text-decoration: none;
                transition: all 0.2s;
                border-bottom: 1px dashed var(--primary);
              }

               .pricing-action-link:hover {
                color: var(--text);
                border-bottom-color: var(--text);
              }

              .btn-load-more {
                background: transparent;
                border: none;
                color: var(--primary);
                font-weight: 700;
                font-size: 0.82rem;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px dashed var(--primary);
                padding: 0 2px 2px 2px;
                outline: none;
              }

              .btn-load-more:hover {
                color: var(--text);
                border-bottom-color: var(--text);
              }

              .pricing-card-footer-info {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.72rem;
                color: var(--text-muted);
                font-weight: 600;
                margin-top: 0.15rem;
              }

              .pricing-card-footer-info .text-green {
                color: #10b981;
              }

              @media (max-width: 968px) {
                .pricing-split-card {
                  grid-template-columns: 1fr;
                  gap: 1.5rem;
                  padding: 1.5rem;
                }
              }
            `}</style>
          
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
