import { supabase } from '../lib/supabase';

// ══════════════════════════════════════════════════════════════════════════════
// DIGITALAND — PRICING ENGINE
// ══════════════════════════════════════════════════════════════════════════════
//
//  MARKUP = 0.6  → Digitaland cobra 60% do preço OpenRouter (40% mais barato)
//
//  Estrutura dos preços no Supabase (tabela `models`):
//    off_in, off_out  =  OpenRouter list_price  (preço bruto da OpenRouter)
//
//  Para o GATEWAY (custo real cobrado do usuário por requisição):
//    cost = (pToks/1e6 × offIn + cToks/1e6 × offOut) × MARKUP
//         = (pToks × offIn + cToks × offOut) / 1e6 × 0.6
//    garante piso MINIMUM_CHARGE com Math.max(cost, MINIMUM_CHARGE)
//
//  Para a LANDING / UI (preço exibido ao usuário, por 1M tokens):
//    ourPrice(off)         = off × MARKUP        (= OpenRouter × 0.6)
//    openrouterPrice(off)  = off × 1.0           (= preço OpenRouter puro)
//    savingsPercent()      = (1 − MARKUP/1.0) × 100  = 40% abaixo da OpenRouter
//
//  Resumo por modelo com off_in=$1.45 (preço OpenRouter):
//    openrouterPrice(1.45) = 1.45   (preço OpenRouter — referência)
//    ourPrice(1.45)        = 0.87   (Digitaland — 40% abaixo da OpenRouter)
//    Gateway cobra por req = offReal × 0.6  (desconto direto aplicado)
// ══════════════════════════════════════════════════════════════════════════════

export const MARKUP         = 0.6;
export const OFFICIAL_MULT  = 1;   // 1 = preço Supabase já é OpenRouter direto
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

// ─── FEATURED / COMPARISON DATA ───────────────────────────────────────────────

export const getFeaturedModels = async () => {
  const models = await getDynamicModels();
  return models.filter(m => m.badge === 'Flagship' || m.badge === 'Popular').slice(0, 3);
};

// Números de referência na tabela da página de Pricing
// off_in deve ser o preço OpenRouter puro (não multiplicado)
export const PRICING_COMPARE = [
  { model: 'GPT-4o',            offIn: 1.375, offOut: 5.50  },
  { model: 'Claude 3.5 Sonnet', offIn: 1.65,  offOut: 8.25  },
  { model: 'DeepSeek V3',       offIn: 0.126, offOut: 0.252 }
];

// Modelos hardcoded usados no grid da landing page
// offIn = preço OpenRouter puro — ourPrice() aplica markup 1.4 automaticamente
export const FEATURED_MODELS = [
  { name: 'GPT-4o',            provider: 'OpenAI',    badge: 'Flagship', offIn: 1.375 },
  { name: 'Claude Sonnet 4.6', provider: 'Anthropic', badge: 'Popular',  offIn: 1.65  },
  { name: 'DeepSeek V3',       provider: 'DeepSeek',  badge: 'Value',    offIn: 0.126 }
];
