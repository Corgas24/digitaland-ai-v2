/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DIGITALAND — OpenRouter API Client
 * ─────────────────────────────────────────────────────────────────────────────
 *  Optional: fetches the live OpenRouter catalog at runtime.
 *  The primary Source-of-Truth for Free-tier prices is openrouter-catalog.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';

/** 1-to-1 mapping from OpenRouter slugs → standardized provider names */
const PROVIDER_MAP = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', meta: 'Meta',
  mistralai: 'Mistral', mistral: 'Mistral', deepseek: 'DeepSeek', xai: 'xAI',
  alibaba: 'Alibaba', qwen: 'Alibaba', bytedance: 'ByteDance',
  moonshot: 'Moonshot', minimax: 'MiniMax', zhipuai: 'Zhipu', zhipu: 'Zhipu',
  xiaomi: 'Xiaomi', kuaishou: 'Kuaishou', midjourney: 'Midjourney',
  cohere: 'Cohere', perplexity: 'Perplexity',
  'stability-ai': 'Stability AI', stabilityai: 'Stability AI',
  microsoft: 'Microsoft', amazon: 'Amazon',
  infereon: 'Infereon', cerebras: 'Cerebras', groq: 'Groq',
  together: 'Together', sambanova: 'SambaNova', moonshotai: 'Moonshot',
};

/** PK, Gemini, Cohere etc. often mark free models with these fragments */
const FREE_MARKERS = ['/free', ':free', '-free'];

/** OpenRouter API type → Digitaland type */
const TYPE_MAP = {
  'text-generation': 'Chat',   'chat': 'Chat',          'chat-completion': 'Chat',
  'image-generation': 'Image','instruct-image': 'Image','image-edit': 'Image',
  'audio-speech': 'Audio',     'audio-transcription': 'Audio', 'tts': 'Audio', 'stt': 'Audio',
  'video-generation': 'Video', 'embeddings': 'Embedding','embedding': 'Embedding',
  reasoning: 'Reasoning',      search: 'Search',
};

function normalizeProvider(slug) {
  const low = slug.toLowerCase();
  if (PROVIDER_MAP[low]) return PROVIDER_MAP[low];
  for (const [k, v] of Object.entries(PROVIDER_MAP)) {
    if (low.includes(k)) return v;
  }
  return low.split('/')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function isFreeId(id)       { return FREE_MARKERS.some(m => id.toLowerCase().includes(m)); }
function normalizeType(item, id) {
  const t = id.toLowerCase();
  if (t.includes('deepseek-r1') || t.includes('o1') || t.includes('o3') || t.includes('reasoning')) return 'Reasoning';
  if (t.includes('image') || t.includes('dall') || t.includes('midjourney') || t.includes('cogview') || t.includes('flux')) return 'Image';
  if (t.includes('audio') || t.includes('whisper') || t.includes('tts')) return 'Audio';
  if (t.includes('video') || t.includes('veo') || t.includes('sora')) return 'Video';
  if (t.includes('embed') || t.includes('embedding')) return 'Embedding';
  if (t.includes('search') || t.includes('sonar')) return 'Search';
  return TYPE_MAP[item.type] || TYPE_MAP[id.toLowerCase()] || 'Chat';
}

/**
 * Fetch the OpenRouter catalog. Returns every model (free + paid) so callers
 * can filter by price as needed.
 */
export async function fetchOpenRouterModels() {
  const res = await fetch(OPENROUTER_API, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);
  const { data } = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const rawId = item.id;
    const provider = normalizeProvider(rawId);
    const free    = isFreeId(rawId);
    const type    = free ? 'Free' : normalizeType(item, rawId);
    const offIn   = item.pricing?.prompt ?? 0;
    const offOut  = item.pricing?.completion ?? 0;

    return {
      id:    rawId,
      name:  item.name || rawId.split('/').pop() || rawId,
      provider,
      type,
      badge: free ? 'Free' : '',
      offIn:  Math.round(offIn * 1000) / 1000,
      offOut: Math.round(offOut * 1000) / 1000,
    };
  });
}
