
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const MARKUP = 1.4;

// UNIVERSAL PROFIT CASCADE
const CASCADE: Record<string, string[]> = {
  // TEXT
  'claude-3-opus': ['claude-3-5-sonnet', 'claude-3-haiku'],
  'claude-3-5-sonnet': ['claude-3-haiku'],
  'gpt-4': ['gpt-4o', 'gpt-4o-mini'],
  'gpt-4o': ['gpt-4o-mini'],
  'llama-3.1-405b': ['llama-3.1-70b', 'llama-3.1-8b'],
  'llama-3.1-70b': ['llama-3.1-8b'],
  'gemini-1.5-pro': ['gemini-1.5-flash'],
  'mistral-large': ['mistral-medium', 'mistral-small'],
  'qwen-max': ['qwen-plus', 'qwen-turbo'],

  // IMAGE
  'dall-e-3': ['dall-e-2', 'stable-diffusion-xl', 'midjourney'],
  'stable-diffusion-xl': ['stable-diffusion-v1.5'],
  'flux-pro': ['flux-dev', 'flux-schnell'],

  // VIDEO
  'sora': ['luma-dream-machine', 'runway-gen-2', 'pika-art'],
  'runway-gen-3': ['runway-gen-2', 'pika-art'],

  // AUDIO
  'whisper-large-v3': ['whisper-large-v2', 'whisper-medium'],
  'canary': ['whisper-large-v3']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const xApiKey = req.headers.get('x-api-key');
    let userProfile = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (user && !authError) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
        userProfile = profile;
      }
    }

    if (!userProfile && xApiKey) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .filter('api_keys', 'cs', `[{"key":"${xApiKey}"}]`)
        .single();
      userProfile = profile;
    }

    if (!userProfile) return new Response(JSON.stringify({ error: { message: "Unauthorized." } }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const incomingBody = await req.json();
    const originalModelId = incomingBody.model || 'gpt-4o-mini';
    
    if (!!incomingBody.stream) incomingBody.stream_options = { include_usage: true };

    const primaryUrl = Deno.env.get('UPSTREAM_API_URL');
    const primaryKey = Deno.env.get('UPSTREAM_API_KEY');
    const fallbackUrl = Deno.env.get('FALLBACK_API_URL');
    const fallbackKey = Deno.env.get('FALLBACK_API_KEY');

    // GET BILLING RATES FOR ORIGINAL MODEL
    const { data: billingModel } = await supabaseAdmin
      .from('models')
      .select('off_in, off_out')
      .ilike('id', originalModelId)
      .single();
    const rates = billingModel || { off_in: 2.0, off_out: 6.0 };

    let response;
    let finalModelId = originalModelId;
    let usedFallbackProvider = false;
    const tryModels = [originalModelId, ...(CASCADE[originalModelId] || [])];

    // CASCADE EXECUTION
    for (const model of tryModels) {
      try {
        finalModelId = model;
        incomingBody.model = model;
        response = await fetch(primaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${primaryKey}` },
          body: JSON.stringify(incomingBody),
        });
        if (response.ok) break;
      } catch (e) { }
    }

    // FALLBACK PROVIDER
    if ((!response || !response.ok) && fallbackKey) {
      usedFallbackProvider = true;
      finalModelId = originalModelId;
      incomingBody.model = originalModelId;
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${fallbackKey}`,
          'HTTP-Referer': 'https://digitaland.ai',
          'X-Title': 'Digitaland AI Gateway'
        },
        body: JSON.stringify(incomingBody),
      });
    }

    if (incomingBody.stream && response.ok) {
      const upstreamReader = response.body?.getReader();
      const decoder = new TextDecoder();
      let promptTokens = 0;
      let completionTokens = 0;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await upstreamReader!.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              
              if (chunk.includes('"usage"')) {
                const parts = chunk.split('data: ');
                for (const part of parts) {
                  const trimmed = part.trim();
                  if (!trimmed || trimmed === '[DONE]') continue;
                  try {
                    const data = JSON.parse(trimmed);
                    const usage = data.usage || data.x_deepseek_usage || data.openrouter_usage;
                    if (usage) {
                      promptTokens = usage.prompt_tokens || promptTokens;
                      completionTokens = usage.completion_tokens || completionTokens;
                    }
                  } catch { }
                }
              }
              controller.enqueue(value);
            }
          } finally {
            controller.close();
            try {
              const totalIn = promptTokens || 20;
              const totalOut = completionTokens || 40;
              const cost = ((totalIn / 1000000 * rates.off_in) + (totalOut / 1000000 * rates.off_out)) * MARKUP;

              if (userProfile.id !== 'mock-rooter-id') {
                const { data: p } = await supabaseAdmin.from('profiles').select('balance').eq('id', userProfile.id).single();
                await supabaseAdmin.from('profiles').update({ 
                  balance: (p?.balance ?? userProfile.balance) - cost, 
                  last_request_at: new Date().toISOString() 
                }).eq('id', userProfile.id);
                
                await supabaseAdmin.from('logs').insert({ 
                  user_id: userProfile.id, 
                  model: finalModelId, 
                  total_tokens: totalIn + totalOut, 
                  cost: cost,
                  metadata: { requested: originalModelId, used: finalModelId, provider: usedFallbackProvider ? 'fallback' : 'primary' }
                });
              }
            } catch (e) { console.error('BILLING ERROR:', e); }
          }
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
    } else {
      const responseClone = response.clone();
      let data;
      try { data = await response.json(); } catch { 
        const text = await responseClone.text();
        data = { choices: [{ message: { content: text } }] };
      }

      if (response.ok) {
        const usage = data.usage || data.x_deepseek_usage || data.openrouter_usage;
        const pTokens = usage?.prompt_tokens || 20;
        const cTokens = usage?.completion_tokens || 40;
        const cost = ((pTokens / 1000000 * rates.off_in) + (cTokens / 1000000 * rates.off_out)) * MARKUP;

        if (userProfile.id !== 'mock-rooter-id') {
          const { data: p } = await supabaseAdmin.from('profiles').select('balance').eq('id', userProfile.id).single();
          await supabaseAdmin.from('profiles').update({ 
            balance: (p?.balance ?? userProfile.balance) - cost, 
            last_request_at: new Date().toISOString() 
          }).eq('id', userProfile.id);
          
          await supabaseAdmin.from('logs').insert({ 
            user_id: userProfile.id, 
            model: finalModelId, 
            total_tokens: pTokens + cTokens, 
            cost: cost,
            metadata: { requested: originalModelId, used: finalModelId, provider: usedFallbackProvider ? 'fallback' : 'primary' }
          });
        }
      }
      return new Response(JSON.stringify(data), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (err) { return new Response(JSON.stringify({ error: { message: err.message } }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
