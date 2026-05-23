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
  OpenAI:    { color: '#10a37f', short: 'O',  logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
  Anthropic: { color: '#f5efe6', short: 'A',  logo: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/anthropic.svg' },
  Google:    { color: '#1a73e8', short: 'G',  logo: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/gemini.svg' },
  Meta:      { color: '#0668E1', short: 'M',  logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg' },
  Mistral:   { color: '#f5d142', short: 'Mi', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Mistral_AI_logo.svg' },
  DeepSeek:  { color: '#4d6eff', short: 'D',  logo: 'https://avatars.githubusercontent.com/u/148330874?s=200&v=4' },
  xAI:       { color: '#000000', short: 'X',  logo: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/xai.svg' },
  Alibaba:   { color: '#ff6600', short: 'Al', logo: 'https://www.vectorlogo.zone/logos/alibaba/alibaba-icon.svg' },
  ByteDance: { color: '#3370ff', short: 'BD', logo: 'https://avatars.githubusercontent.com/u/16743285?s=200&v=4' },
  Moonshot:  { color: '#4058f2', short: 'Mo', logo: 'https://avatars.githubusercontent.com/u/132961858?s=200&v=4' },
  MiniMax:   { color: '#1dcd8d', short: 'MM', logo: 'https://avatars.githubusercontent.com/u/105740440?s=200&v=4' },
  Zhipu:     { color: '#3c3ffb', short: 'ZP', logo: 'https://avatars.githubusercontent.com/u/106727244?s=200&v=4' },
  Xiaomi:    { color: '#ff6900', short: 'Xi', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg' },
  Kuaishou:  { color: '#ff4d00', short: 'Ks', logo: 'https://avatars.githubusercontent.com/u/14605963?s=200&v=4' },
  Midjourney:{ color: '#ffffff', short: 'MJ', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Midjourney_Emblem.png' },
  Cohere:    { color: '#3cffc8', short: 'Co', logo: 'https://avatars.githubusercontent.com/u/95642823?s=200&v=4' },
  Perplexity:{ color: '#00a3ff', short: 'Px', logo: 'https://avatars.githubusercontent.com/u/118367098?s=200&v=4' },
  'Stability AI': { color: '#7e22ce', short: 'SD', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Stability_AI_logo.svg' },
  Microsoft: { color: '#00a4ef', short: 'MS', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
  Amazon:    { color: '#ff9900', short: 'Am', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg' },
  OpenRouter:{ color: '#6d28d9', short: 'OR', logo: 'https://avatars.githubusercontent.com/u/134468641?s=200&v=4' },
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
    const name = m.name || '';
    const nameLower = name.toLowerCase();
    const isMini      = nameLower.includes('mini')
                     || nameLower.includes('flash')
                     || nameLower.includes('8b');
    const isReasoning = m.type === 'Reasoning';
    const isFlagship  = m.badge === 'Flagship';

    // off_in / off_out === preço OpenRouter direto (por 1M tokens)
    const offIn  = m.off_in  ?? 0;
    const offOut = m.off_out ?? 0;

    return {
      id:         m.id || '',
      name:       name || 'Unnamed Model',
      provider:   m.provider || 'Other',
      type:       m.type || 'Chat',
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
