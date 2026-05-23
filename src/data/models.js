import { supabase } from '../lib/supabase';

// ══════════════════════════════════════════════════════════════════════════════
// DIGITALAND — PRICING ENGINE
// ══════════════════════════════════════════════════════════════════════════════
//
//  MARKUP = 1.4  → Digitaland cobra 1.4x o custo (40% de margem de lucro sobre o custo CrazyRouter)
//  OFFICIAL_MULT = 2.0 → O preço "oficial" do mercado (OpenRouter/etc) é assumido como 2x o custo CrazyRouter
//
//  Estrutura dos preços no Supabase (tabela `models`):
//    off_in, off_out  =  Custo CrazyRouter puro
//
//  Para o GATEWAY (custo real cobrado do usuário por requisição):
//    cost = (pToks/1e6 × offIn + cToks/1e6 × offOut) × MARKUP
//         = (pToks × offIn + cToks × offOut) / 1e6 × 1.4
//    garante piso MINIMUM_CHARGE com Math.max(cost, MINIMUM_CHARGE)
//
//  Para a LANDING / UI (preço exibido ao usuário, por 1M tokens):
//    ourPrice(off)         = off × MARKUP        (= Custo × 1.4)
//    openrouterPrice(off)  = off × OFFICIAL_MULT (= Custo × 2.0)
//    savingsPercent()      = (1 − MARKUP/OFFICIAL_MULT) × 100  = 30% de poupança vs Oficial
//
// ══════════════════════════════════════════════════════════════════════════════

export const MARKUP         = 1.4;
export const OFFICIAL_MULT  = 2.0;
export const MINIMUM_CHARGE = 0.001;

// ─── PROVIDERS ────────────────────────────────────────────────────────────────

export const PROVIDERS = {
  OpenAI:    { color: '#10a37f', short: 'O'  },
  Anthropic: { color: '#d97757', short: 'A'  },
  Google:    { color: '#4285f4', short: 'G'  },
  Meta:      { color: '#0668E1', short: 'M'  },
  Mistral:   { color: '#f5d142', short: 'Mi' },
  DeepSeek:  { color: '#4d6eff', short: 'D'  },
  xAI:       { color: '#ffffff', short: 'X'  },
  Alibaba:   { color: '#ff6600', short: 'Al' },
  ByteDance: { color: '#3370ff', short: 'BD' },
  Moonshot:  { color: '#4058f2', short: 'Mo' },
  MiniMax:   { color: '#1dcd8d', short: 'MM' },
  Zhipu:     { color: '#3c3ffb', short: 'ZP' },
  Xiaomi:    { color: '#ff6900', short: 'Xi' },
  Kuaishou:  { color: '#ff4d00', short: 'Ks' },
  Midjourney:{ color: '#ffffff', short: 'MJ' },
  Cohere:    { color: '#3cffc8', short: 'Co' },
  Perplexity:{ color: '#00a3ff', short: 'Px' },
  'Stability AI': { color: '#7e22ce', short: 'SD' },
  Microsoft: { color: '#00a4ef', short: 'MS' },
  Amazon:    { color: '#ff9900', short: 'Am' },
  OpenRouter:{ color: '#6d28d9', short: 'OR' },
};

// ─── DYNAMIC MODEL LOADING ────────────────────────────────────────────────────

let cachedModels = [];

export const getDynamicModels = async () => {
  if (cachedModels.length > 0) return cachedModels;

  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('is_active', true)
    .order('provider', { ascending: true });

  if (error) {
    console.error('Error fetching models:', error);
    return null;
  }
  if (!data || data.length === 0) {
    console.warn('No active models found in the database.');
    return null;
  }

  cachedModels = data.map(m => {
    const name = m.name;
    const isMini      = name.toLowerCase().includes('mini')
                     || name.toLowerCase().includes('flash')
                     || name.toLowerCase().includes('8b');
    const isReasoning = m.type === 'Reasoning';
    const isFlagship  = m.badge === 'Flagship';

    // off_in / off_out === preço OpenRouter direto (por 1M tokens)
    const offIn  = m.off_in  ?? 0;
    const offOut = m.off_out ?? 0;

    return {
      id:         m.id,
      name:       m.name,
      provider:   m.provider,
      type:       m.type,
      badge:      m.badge || '',
      offIn,      // preço Crazy input
      offOut,     // preço Crazy output
      ctx:        '-',
      vision:     m.type === 'Vision',
      tools:      m.type !== 'Image' && m.type !== 'Audio' && m.type !== 'Video',
      reasoning:  isReasoning,
      speed:      isMini ? 95 : (isFlagship ? 70 : (isReasoning ? 30 : 60)),
      intel:      isReasoning ? 98 : (isFlagship ? 92 : (isMini ? 75 : 80)),
    };
  });

  return cachedModels;
};

export const MODELS = [];   // placeholder — dados reais vêm do Supabase

// ─── PRICING HELPERS ─────────────────────────────────────────────────────────
//
//  ourPrice(off)           preço Digitaland ao usuário  = off × 1.4
//  OpenRouterPrice(off)   preço OpenRouter de referência = off × 1.0
//  savingsPercent()        (1−MARKUP) × 100 = 40%  → Digitaland 40% mais barato
//
//  Exemplo: off = $1.45 (preço Crazy para aquele modelo)
//    OpenRouterPrice(1.45) = 1.45          (preço Crazy web)
//    ourPrice(1.45)         = 2.03          (preço Digitaland — 40% acima)
//    Usuário paga em tempo real: cost = (tokens/1M × off) × 1.4  (= ourPrice)

// Preço Digitaland — aplica MARKUP=1.4 sobre o preço OpenRouter.
// Usado em toda a UI (Pricing, Models, Landing, Dashboard).
export const ourPrice = (offPrice) => Math.max(offPrice * MARKUP, MINIMUM_CHARGE);

// Preço OpenRouter de referência — usado apenas para comparação na UI.
export const openrouterPrice = (offPrice) => offPrice * OFFICIAL_MULT;

// % de economia do Digitaland em relação à OpenRouter
export const savingsPercent = () => Math.round((1 - (MARKUP / OFFICIAL_MULT)) * 100);

// ─── OPENROUTER COMPARISON ─────────────────────────────────────────────────────
//
//  openRouterPrice(off)     preço OpenRouter referência (sem markup) = off × 1
//  savingsVsOpenRouter()    economia % do Digitaland vs OpenRouter
//                           = (1 − MARKUP) × 100 = 40%
//  Exemplo: off = $1.375
//    openRouterPrice(1.375) = 1.375          (preço OpenRouter por 1M tokens)
//    ourPrice(1.375)         = 1.925          (Digitaland — ~40% a mais)
//    savingsVsOpenRouter()   = −40%           (usuário paga 40% acima vs OpenRouter ref)
// ──────────────────────────────────────────────────────────────────────────────

export const openRouterPrice = (offPrice) => offPrice * 1;  // preço OpenRouter é referência direta

/** % que o preço Digitaland está acima do preço OpenRouter (número positivo = mais caro) */
export const markupPercent = () => Math.round((MARKUP - 1) * 100);

/**
 * Compare our price vs an external price.
 * @param {number} our         – preço Digitaland por 1M tokens
 * @param {number} external    – preço externo (OpenRouter / CrazyRouter) por 1M tokens
 * @returns {string} e.g. "+40%" se somos mais caros, "-40%" se mais baratos
 */
export const comparePercent = (our, external) => {
  if (!external || external === 0) return '—';
  const pct = ((our - external) / external) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
};

// ─── FEATURED / COMPARISON DATA ───────────────────────────────────────────────

export const getFeaturedModels = async () => {
  const models = await getDynamicModels();
  return models.filter(m => m.badge === 'Flagship' || m.badge === 'Popular').slice(0, 3);
};

// Números de referência na tabela da página de Pricing
// off_in deve ser o preço OpenRouter puro (não multiplicado)
export const PRICING_COMPARE = [
  { model: 'GPT-5.5',            offIn: 2.75,  offOut: 16.50 },
  { model: 'Claude Opus 4.7',    offIn: 2.75,  offOut: 13.75 },
  { model: 'Gemini 3.1 Pro',     offIn: 1.10,  offOut: 6.60  }
];

// Modelos hardcoded usados no grid da landing page
// offIn = preço OpenRouter puro — ourPrice() aplica markup 1.4 automaticamente
export const FEATURED_MODELS = [
  { name: 'GPT-5.5',             provider: 'OpenAI',    badge: 'Flagship', offIn: 2.75 },
  { name: 'Claude Opus 4.7',     provider: 'Anthropic', badge: 'Popular',  offIn: 2.75 },
  { name: 'Gemini 3.1 Pro',      provider: 'Google',    badge: 'Flagship', offIn: 1.10 }
];
