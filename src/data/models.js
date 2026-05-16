import { supabase } from '../lib/supabase';

export const MARKUP = 1.4; 
export const OFFICIAL_MULT = 1.35; 

export const PROVIDERS = {
  OpenAI: { color: '#10a37f', short: 'O' },
  Anthropic: { color: '#d97757', short: 'A' },
  Google: { color: '#4285f4', short: 'G' },
  Meta: { color: '#0668E1', short: 'M' },
  Mistral: { color: '#f5d142', short: 'Mi' },
  DeepSeek: { color: '#4d6eff', short: 'D' },
  xAI: { color: '#fff', short: 'X' },
  Alibaba: { color: '#ff6600', short: 'Al' },
  ByteDance: { color: '#3370ff', short: 'BD' },
  Moonshot: { color: '#4058f2', short: 'Mo' },
  MiniMax: { color: '#1dcd8d', short: 'MM' },
  Zhipu: { color: '#3c3ffb', short: 'ZP' },
  Xiaomi: { color: '#ff6900', short: 'Xi' },
  Kuaishou: { color: '#ff4d00', short: 'Ks' },
  Midjourney: { color: '#fff', short: 'MJ' },
  Cohere: { color: '#3cffc8', short: 'Co' },
  Perplexity: { color: '#00a3ff', short: 'Px' },
  'Stability AI': { color: '#7e22ce', short: 'SD' },
  Microsoft: { color: '#00a4ef', short: 'MS' },
  Amazon: { color: '#ff9900', short: 'Am' },
  OpenRouter: { color: '#6d28d9', short: 'OR' },
};

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DIGITALAND NEURAL MATRIX - DYNAMIC MODEL LOADING
 * ══════════════════════════════════════════════════════════════════════════════
 */

// We maintain a cache of processed models
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
    return [];
  }

  cachedModels = data.map(m => {
    const name = m.name;
    const isMini = name.toLowerCase().includes('mini') || name.toLowerCase().includes('flash') || name.toLowerCase().includes('8b');
    const isReasoning = m.type === 'Reasoning';
    const isFlagship = m.badge === 'Flagship';

    return {
      id: m.id,
      name: m.name,
      provider: m.provider,
      type: m.type,
      badge: m.badge || '',
      offIn: m.off_in,
      offOut: m.off_out,
      ctx: '-',
      vision: m.type === 'Vision',
      tools: m.type !== 'Image' && m.type !== 'Audio' && m.type !== 'Video',
      reasoning: isReasoning,
      speed: isMini ? 95 : (isFlagship ? 70 : (isReasoning ? 30 : 60)),
      intel: isReasoning ? 98 : (isFlagship ? 92 : (isMini ? 75 : 80))
    };
  });

  return cachedModels;
};

// Placeholder for initial static load (to prevent breaking UI while fetching)
export const MODELS = []; 

// Helper functions for consistent pricing
export const ourPrice = (offPrice) => (offPrice / OFFICIAL_MULT) * MARKUP;
export const officialPrice = (offPrice) => offPrice;
export const savingsPercent = () => Math.round((1 - (1/OFFICIAL_MULT)) * 100);

// Dynamic helpers
export const getFeaturedModels = async () => {
  const models = await getDynamicModels();
  return models.filter(m => m.badge === 'Flagship' || m.badge === 'Popular').slice(0, 3);
};

export const PRICING_COMPARE = [
  { model: 'GPT-4o', offIn: 1.375, offOut: 5.50 },
  { model: 'Claude 3.5 Sonnet', offIn: 1.65, offOut: 8.25 },
  { model: 'DeepSeek V3', offIn: 0.126, offOut: 0.252 }
];

// For the landing page
export const FEATURED_MODELS = [
  { name: 'GPT-4o', provider: 'OpenAI', badge: 'Flagship', offIn: 1.375 },
  { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Popular', offIn: 1.65 },
  { name: 'DeepSeek V3', provider: 'DeepSeek', badge: 'Value', offIn: 0.126 }
];
