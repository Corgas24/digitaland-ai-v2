import { supabase } from '../lib/supabase';

// ══════════════════════════════════════════════════════════════════════════════
// DIGITALAND — PRICING ENGINE
// ══════════════════════════════════════════════════════════════════════════════
//
//  MARKUP = 1.4       → Digitaland cobra 1.4x o preço OpenRouter (40% de margem)
//  OFFICIAL_MULT = 1.0 → O preço OpenRouter é a referência directa (1.0x)
//
//  Estrutura dos preços no Supabase (tabela `models`):
//    off_in, off_out  =  Preço OpenRouter por 1M tokens (preço base de referência)
//
//  Para o GATEWAY (custo real cobrado do usuário por requisição):
//    cost = (pToks/1e6 × offIn + cToks/1e6 × offOut) × MARKUP
//         = (pToks × offIn + cToks × offOut) / 1e6 × 1.4
//    garante piso MINIMUM_CHARGE com Math.max(cost, MINIMUM_CHARGE)
//
//  Para a LANDING / UI (preço exibido ao usuário, por 1M tokens):
//    ourPrice(off)         = off × MARKUP        (= OpenRouter × 1.4)
//    openrouterPrice(off)  = off × OFFICIAL_MULT (= OpenRouter × 1.0)
//    markupPercent()       = (MARKUP − 1) × 100  = +40% premium vs OpenRouter
//
// ══════════════════════════════════════════════════════════════════════════════

export const MARKUP         = 1.4;
export const OFFICIAL_MULT  = 1.0; // OpenRouter price is reference direct (1.0x)
export const MINIMUM_CHARGE = 0.001;

// ─── PROVIDERS ────────────────────────────────────────────────────────────────

export const PROVIDERS = {
  OpenAI:    { color: '#10a37f', short: 'O',  logo: '/openai-logo.png' },
  Anthropic: { color: '#cc9b7c', short: 'A',  logo: '/anthropic-logo.png' },
  Google:    { color: '#1a73e8', short: 'G',  logo: '/gemini-logo.png' },
  Meta:      { color: '#0668E1', short: 'M',  logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg' },
  Mistral:   { color: '#fd7e14', short: 'Mi', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Mistral_AI_logo.svg' },
  DeepSeek:  { color: '#4d6eff', short: 'D',  logo: '/deepseek-logo.png' },
  xAI:       { color: '#ffffff', short: 'X',  logo: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/xai.svg' },
  Alibaba:   { color: '#ff6600', short: 'Al', logo: '/qwen-logo.png' },
  ByteDance: { color: '#3370ff', short: 'BD', logo: '/bytedance-logo.png' },
  Moonshot:  { color: '#4058f2', short: 'Mo', logo: 'https://avatars.githubusercontent.com/u/132961858?s=200&v=4' },
  MiniMax:   { color: '#1dcd8d', short: 'MM', logo: 'https://avatars.githubusercontent.com/u/105740440?s=200&v=4' },
  Zhipu:     { color: '#3c3ffb', short: 'ZP', logo: 'https://avatars.githubusercontent.com/u/106727244?s=200&v=4' },
  Xiaomi:    { color: '#ff6900', short: 'Xi', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg' },
  Kuaishou:  { color: '#ff4d00', short: 'Ks', logo: 'https://avatars.githubusercontent.com/u/14605963?s=200&v=4' },
  Midjourney:{ color: '#6366f1', short: 'MJ', logo: '/midjourney-logo.png' },
  Cohere:    { color: '#3cffc8', short: 'Co', logo: '/cohere-logo.png' },
  Perplexity:{ color: '#00a3ff', short: 'Px', logo: 'https://avatars.githubusercontent.com/u/118367098?s=200&v=4' },
  'Stability AI': { color: '#ec4899', short: 'SD', logo: '/stability-logo.png' },
  Microsoft: { color: '#00a4ef', short: 'MS', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
  Amazon:    { color: '#ff9900', short: 'Am', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg' },
  OpenRouter:{ color: '#6d28d9', short: 'OR', logo: 'https://avatars.githubusercontent.com/u/134468641?s=200&v=4' },
};


const formatModelName = (name) => {
  if (!name) return 'Unnamed Model';
  // If it already starts with an uppercase letter, preserve it
  if (/^[A-Z]/.test(name)) return name;

  // Replace dashes with spaces
  let formatted = name.replace(/-/g, ' ');

  // Capitalize each word
  formatted = formatted.replace(/\b\w/g, c => c.toUpperCase());

  // Handle specific version formatting (e.g. "4 7" -> "4.7")
  formatted = formatted.replace(/(\d)\s(\d)/g, '$1.$2');

  // Specific acronym replacements
  formatted = formatted
    .replace(/\bGpt\b/gi, 'GPT')
    .replace(/\bApi\b/gi, 'API')
    .replace(/\bLlm\b/gi, 'LLM')
    .replace(/\bSd\b/gi, 'SD')
    .replace(/\bMj\b/gi, 'MJ');

  return formatted;
};

// ─── DYNAMIC MODEL LOADING ────────────────────────────────────────────────────

let cachedModels = [];

export const getDynamicModels = async () => {
  if (cachedModels.length > 0) return cachedModels;

  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('is_active', true)
    .order('off_in', { ascending: false });

  if (error) {
    console.error('Error fetching models:', error);
    return null;
  }
  if (!data || data.length === 0) {
    console.warn('No active models found in the database.');
    return null;
  }

  const seenNames = new Set();
  const uniqueData = [];

  data.forEach(m => {
    const rawName = m.name || '';
    const name = formatModelName(rawName);
    const key = `${name}__${m.provider || ''}`.toLowerCase();

    if (seenNames.has(key)) {
      const existingIndex = uniqueData.findIndex(item => {
        const existingName = formatModelName(item.name || '');
        return `${existingName}__${item.provider || ''}`.toLowerCase() === key;
      });
      if (existingIndex !== -1) {
        const existing = uniqueData[existingIndex];
        // Prefer ID with a slash (e.g. "openai/gpt-4o" over "gpt-4o")
        // OpenRouter-prefixed models have verified, up-to-date prices
        if (!(existing.id || '').includes('/') && (m.id || '').includes('/')) {
          uniqueData[existingIndex] = m;
        }
      }
      return;
    }

    seenNames.add(key);
    uniqueData.push(m);
  });

  cachedModels = uniqueData.map(m => {
    const rawName = m.name || '';
    const name = formatModelName(rawName);
    const nameLower = name.toLowerCase();
    const isMini      = nameLower.includes('mini')
                     || nameLower.includes('flash')
                     || nameLower.includes('8b');
    const isReasoning = m.type === 'Reasoning';
    const isFlagship  = m.badge === 'Flagship';

    // off_in / off_out === preço OpenRouter directo (por 1M tokens)
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
//  ourPrice(off)           preço Digitaland ao usuário  = off × 1.4  (+40% premium)
//  openrouterPrice(off)    preço OpenRouter de referência = off × 1.0
//  markupPercent()         (MARKUP − 1) × 100 = +40%
//
//  Exemplo: off = $2.50 (preço OpenRouter do GPT-4o)
//    openrouterPrice(2.50) = $2.50           (preço OpenRouter)
//    ourPrice(2.50)         = $3.50           (preço Digitaland — +40% premium)
//    Usuário paga: cost = (tokens/1M × off) × 1.4

// Preço Digitaland — aplica MARKUP=1.4 sobre o preço OpenRouter.
// Usado em toda a UI (Pricing, Models, Landing, Dashboard).
export const ourPrice = (offPrice) => Math.max(offPrice * MARKUP, MINIMUM_CHARGE);

// Preço OpenRouter de referência — usado apenas para comparação na UI.
export const openrouterPrice = (offPrice) => offPrice * OFFICIAL_MULT;

// % premium do Digitaland em relação ao OpenRouter
export const savingsPercent = () => Math.round((1 - (MARKUP / OFFICIAL_MULT)) * 100);

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
// off_in/off_out = preço OpenRouter puro (por 1M tokens, não multiplicado)
export const PRICING_COMPARE = [
  { model: 'GPT-5.5',            offIn: 5.00,  offOut: 30.00 },
  { model: 'Claude Opus 4.8',    offIn: 5.00,  offOut: 25.00 },
  { model: 'Gemini 3.1 Pro',     offIn: 2.00,  offOut: 12.00 }
];

// Modelos hardcoded usados no grid da landing page
// offIn = preço OpenRouter puro — ourPrice() aplica markup 1.4 automaticamente
export const FEATURED_MODELS = [
  { name: 'GPT-5.5',             provider: 'OpenAI',    badge: 'Flagship', offIn: 5.00 },
  { name: 'Claude Opus 4.8',     provider: 'Anthropic', badge: 'Popular',  offIn: 5.00 },
  { name: 'Gemini 3.1 Pro',      provider: 'Google',    badge: 'Flagship', offIn: 2.00 }
];
