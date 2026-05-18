<<<<<<< HEAD
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
=======
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
>>>>>>> f20cb4e (fix: route playground chat through Vercel proxy to resolve CORS fetch errors)

const MARKUP = 1.4;
const OFFICIAL_MULT = 1;

// UNIVERSAL PROFIT CASCADE - Strategic Failover Map (CrazyRouter IDs)
const CASCADE: Record<string, string[]> = {
  // --- TEXT FRONTIER ---
  'gpt-5': ['gpt-4.1', 'gpt-4o', 'gpt-5-mini'],
  'gpt-4o': ['gpt-4o-mini', 'claude-sonnet-4-6', 'llama-3.3-70b'],
  'claude-opus-4-7': ['claude-sonnet-4-6', 'gpt-4o', 'claude-haiku-4-5'],
  'claude-sonnet-4-6': ['gpt-4o-mini', 'claude-haiku-4-5', 'llama-3.3-70b'],
  'gemini-3.1-pro': ['gemini-3-flash', 'gpt-4o-mini'],
  
  // --- REASONING / RESEARCH ---
  'o1': ['o1-mini', 'deepseek-r1', 'gpt-4o'],
  'o1-mini': ['deepseek-r1', 'gpt-4o-mini'],
  'deepseek-r1': ['o1-mini', 'llama-3.3-70b'],
  'deepseek-v3': ['gpt-4o-mini', 'llama-3.3-70b', 'qwen3.6-plus'],
  
  // --- OPEN SOURCE / Llama ---
  'llama-3.1-405b': ['llama-3.3-70b', 'llama-3.1-8b'],
  'llama-3.3-70b': ['llama-3.1-8b'],
  
  // --- SPECIALIZED ---
  'mistral-large-3': ['mistral-small-3.1', 'gpt-4o-mini'],
  'qwen3-max': ['qwen3.6-plus', 'qwen3-mini'],
  'grok-4': ['grok-4-fast', 'llama-3.3-70b'],

  // --- IMAGE GENERATION ---
  'mj_imagine': ['dall-e-3', 'flux-pro', 'nano-banana-pro'],
  'dall-e-3': ['dall-e-2', 'flux-schnell', 'sdxl'],
  'flux-pro': ['flux-dev', 'flux-schnell', 'sdxl'],

  // --- VIDEO & MULTIMODAL ---
  'runway-gen-3': ['runway-gen-2', 'pika-art', 'veo-3.1'],
  'sora': ['runway-gen-3', 'runway-gen-2'],

  // --- AUDIO ---
  'whisper-1': ['whisper-large-v3', 'whisper-medium'],
};

console.info("gateway server started");

export default {
  fetch: withSupabase({
    auth: ["user", "none"],
    cors: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    }
  }, async (req, ctx) => {
    try {
      let userProfile = null;

<<<<<<< HEAD
    if (!userProfile && xApiKey) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .filter('api_keys', 'cs', '[{"key":"' + xApiKey + '"}]')
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
    let success = false;

    // CASCADE EXECUTION
    for (const model of tryModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        finalModelId = model;
        incomingBody.model = model;
        const attemptResponse = await fetch(primaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': "Bearer " + primaryKey },
          body: JSON.stringify(incomingBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // AGGRESSIVE FALLBACK: If 401/403, the primary key is dead, break loop to hit Fallback Provider immediately
        if (attemptResponse.status === 401 || attemptResponse.status === 403) {
          console.log("Primary Provider Auth Error (401/403). Jumping to fallback...");
          break;
        }

        if (attemptResponse.ok) {
          // Extra check for non-streaming: check if JSON contains error or Chinese chars
          if (!incomingBody.stream) {
            const clone = attemptResponse.clone();
            const json = await clone.json();
            const content = JSON.stringify(json);
            
            // Detect Chinese characters (common in SiliconFlow/DeepSeek errors)
            const hasChinese = /[\u4e00-\u9fa5]/.test(content);
            const hasError = json.error || json.err || (json.success === false) || (json.code && json.code !== 0);
            
            if (hasError || hasChinese) {
              console.log("Provider returned error or foreign text for " + model + ". Continuing cascade...");
              continue;
            }
          }
          response = attemptResponse;
          success = true;
          break;
        }
      } catch (e) {
        console.log("Cascade attempt for " + model + " failed: " + e.message);
      }
    }

    // FALLBACK PROVIDER
    if (!success && fallbackKey) {
      usedFallbackProvider = true;
      finalModelId = originalModelId;
      incomingBody.model = originalModelId;
      try {
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': "Bearer " + fallbackKey,
            'HTTP-Referer': 'https://digitaland.ai',
            'X-Title': 'Digitaland AI Gateway'
          },
          body: JSON.stringify(incomingBody),
        });
        if (fallbackResponse) {
          response = fallbackResponse;
          if (fallbackResponse.ok) {
            if (!incomingBody.stream) {
              const clone = fallbackResponse.clone();
              const json = await clone.json();
              const content = JSON.stringify(json);
              const hasChinese = /[\u4e00-\u9fa5]/.test(content);
              const hasError = json.error || json.err || (json.success === false) || (json.code && json.code !== 0);
              if (!hasError && !hasChinese) {
                success = true;
              }
            } else {
              success = true;
            }
          }
        }
      } catch (e) {
        console.log("Fallback attempt failed: " + e.message);
      }
    }

    if (!response) {
      return new Response(JSON.stringify({ error: { message: "All providers exhausted. Please try again later." } }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const contentType = response.headers.get('content-type') || '';
    const isStream = incomingBody.stream && success && contentType.includes('text/event-stream');

    if (isStream) {
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
              const cost = ((totalIn / 1000000 * (rates.off_in / OFFICIAL_MULT)) + (totalOut / 1000000 * (rates.off_out / OFFICIAL_MULT))) * MARKUP;

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

      const hasChinese = /[\u4e00-\u9fa5]/.test(JSON.stringify(data));
      const isFailedJson = data.error || data.err || (data.success === false) || (data.code && data.code !== 0);

      if (success && response.ok && !hasChinese && !isFailedJson) {
        const usage = data.usage || data.x_deepseek_usage || data.openrouter_usage;
        const pTokens = usage?.prompt_tokens || 20;
        const cTokens = usage?.completion_tokens || 40;
        const cost = ((pTokens / 1000000 * (rates.off_in / OFFICIAL_MULT)) + (cTokens / 1000000 * (rates.off_out / OFFICIAL_MULT))) * MARKUP;

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
=======
      if (ctx.authType === 'user') {
        const userId = ctx.userClaims?.sub;
        if (userId) {
          const { data: profile } = await ctx.supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          userProfile = profile;
>>>>>>> f20cb4e (fix: route playground chat through Vercel proxy to resolve CORS fetch errors)
        }
      } else {
        // Sanitize error message to ensure no Chinese/Provider leaks
        if (hasChinese || response.status === 401 || isFailedJson) {
          data = { error: { message: "Neural Matrix synchronization error. Please try a different model or refresh." } };
        }
        return new Response(JSON.stringify(data), { status: response.ok && !isFailedJson ? 400 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

<<<<<<< HEAD
      return new Response(JSON.stringify(data), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
=======
      if (!userProfile) {
        const xApiKey = req.headers.get('x-api-key');
        if (xApiKey) {
          const { data: profile } = await ctx.supabaseAdmin
            .from('profiles')
            .select('*')
            .filter('api_keys', 'cs', `[{"key":"${xApiKey}"}]`)
            .single();
          userProfile = profile;
        }
      }

      if (!userProfile) {
        return Response.json({ error: { message: "Unauthorized." } }, { status: 401 });
      }

      const incomingBody = await req.json();
      const originalModelId = incomingBody.model || 'gpt-4o-mini';
      
      if (!!incomingBody.stream) incomingBody.stream_options = { include_usage: true };

      const primaryUrl = Deno.env.get('UPSTREAM_API_URL') || 'https://crazyrouter.com/v1/chat/completions';
      const primaryKey = Deno.env.get('UPSTREAM_API_KEY') || Deno.env.get('UPSTREAM_MASTER_KEY');
      const fallbackUrl = Deno.env.get('FALLBACK_API_URL') || 'https://openrouter.ai/api/v1/chat/completions';
      const fallbackKey = Deno.env.get('FALLBACK_API_KEY') || Deno.env.get('OPENROUTER_API_KEY');

      // GET BILLING RATES FOR ORIGINAL MODEL
      const { data: billingModel } = await ctx.supabaseAdmin
        .from('models')
        .select('off_in, off_out')
        .ilike('id', originalModelId)
        .single();
      const rates = billingModel || { off_in: 2.0, off_out: 6.0 };

      let response;
      let finalModelId = originalModelId;
      let usedFallbackProvider = false;
      const tryModels = [originalModelId, ...(CASCADE[originalModelId] || [])];
      let success = false;

      // INTELLIGENT ROUTING: Skip SiliconFlow (primaryUrl) for proprietary models that it cannot support
      const isPrimarySiliconFlow = primaryUrl?.includes('siliconflow');
      const proprietaryKeywords = ['gpt', 'claude', 'gemini', 'o1', 'dall-e', 'mj_imagine', 'sora', 'runway'];
      const isProprietaryModel = proprietaryKeywords.some(kw => originalModelId.toLowerCase().includes(kw));
      const shouldSkipPrimary = isPrimarySiliconFlow && isProprietaryModel;

      if (!shouldSkipPrimary) {
        // CASCADE EXECUTION ON PRIMARY PROVIDER
        for (const model of tryModels) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); 

            finalModelId = model;
            incomingBody.model = model;
            const attemptResponse = await fetch(primaryUrl!, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${primaryKey}` },
              body: JSON.stringify(incomingBody),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // AGGRESSIVE FALLBACK: If 401/403, the primary key is dead, break loop to hit Fallback Provider immediately
            if (attemptResponse.status === 401 || attemptResponse.status === 403) {
              console.log(`Primary Provider Auth Error (401/403). Jumping to fallback...`);
              break;
            }

            if (attemptResponse.ok) {
              // Extra check for non-streaming: check if JSON contains error or Chinese chars
              if (!incomingBody.stream) {
                const clone = attemptResponse.clone();
                const json = await clone.json();
                const content = JSON.stringify(json);
                
                // Detect Chinese characters (common in SiliconFlow/DeepSeek errors)
                const hasChinese = /[\u4e00-\u9fa5]/.test(content);
                const hasError = json.error || json.err || (json.success === false) || (json.code && json.code !== 0);
                
                if (hasError || hasChinese) {
                  console.log(`Primary Provider returned error or foreign text for ${model}. Continuing cascade...`);
                  continue;
                }
              }
              response = attemptResponse;
              success = true;
              break;
            }
          } catch (e) {
            console.log(`Primary Cascade attempt for ${model} failed: ${e.message}`);
          }
        }
      } else {
        console.log(`Intelligent Routing: Skipping primary SiliconFlow for proprietary model ${originalModelId}`);
      }

      // CASCADE EXECUTION ON FALLBACK PROVIDER
      if (!success && fallbackKey) {
        usedFallbackProvider = true;
        for (const model of tryModels) {
          try {
            finalModelId = model;
            incomingBody.model = model;
            const fallbackResponse = await fetch(fallbackUrl!, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${fallbackKey}`,
                'HTTP-Referer': 'https://digitaland.ai',
                'X-Title': 'Digitaland AI Gateway'
              },
              body: JSON.stringify(incomingBody),
            });

            if (fallbackResponse && fallbackResponse.ok) {
              if (!incomingBody.stream) {
                const clone = fallbackResponse.clone();
                const json = await clone.json();
                const content = JSON.stringify(json);
                const hasChinese = /[\u4e00-\u9fa5]/.test(content);
                const hasError = json.error || json.err || (json.success === false) || (json.code && json.code !== 0);
                if (hasError || hasChinese) {
                  console.log(`Fallback Provider returned error or foreign text for ${model}. Continuing cascade...`);
                  continue;
                }
              }
              response = fallbackResponse;
              success = true;
              break;
            }
          } catch (e) {
            console.log(`Fallback Cascade attempt for ${model} failed: ${e.message}`);
          }
        }
      }

      if (!response) {
        return Response.json({ error: { message: "All providers exhausted. Please try again later." } }, { status: 503 });
      }

      const contentType = response.headers.get('content-type') || '';
      const isStream = incomingBody.stream && success && contentType.includes('text/event-stream');

      if (isStream) {
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
                const cost = ((totalIn / 1000000 * (rates.off_in / OFFICIAL_MULT)) + (totalOut / 1000000 * (rates.off_out / OFFICIAL_MULT))) * MARKUP;

                if (userProfile.id !== 'mock-rooter-id') {
                  const { data: p } = await ctx.supabaseAdmin.from('profiles').select('balance').eq('id', userProfile.id).single();
                  await ctx.supabaseAdmin.from('profiles').update({ 
                    balance: (p?.balance ?? userProfile.balance) - cost, 
                    last_request_at: new Date().toISOString() 
                  }).eq('id', userProfile.id);
                  
                  await ctx.supabaseAdmin.from('logs').insert({ 
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
        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
      } else {
        const responseClone = response.clone();
        let data;
        try { data = await response.json(); } catch { 
          const text = await responseClone.text();
          data = { choices: [{ message: { content: text } }] };
        }

        const hasChinese = /[\u4e00-\u9fa5]/.test(JSON.stringify(data));
        const isFailedJson = data.error || data.err || (data.success === false) || (data.code && data.code !== 0);

        if (success && response.ok && !hasChinese && !isFailedJson) {
          const usage = data.usage || data.x_deepseek_usage || data.openrouter_usage;
          const pTokens = usage?.prompt_tokens || 20;
          const cTokens = usage?.completion_tokens || 40;
          const cost = ((pTokens / 1000000 * (rates.off_in / OFFICIAL_MULT)) + (cTokens / 1000000 * (rates.off_out / OFFICIAL_MULT))) * MARKUP;

          if (userProfile.id !== 'mock-rooter-id') {
            const { data: p } = await ctx.supabaseAdmin.from('profiles').select('balance').eq('id', userProfile.id).single();
            await ctx.supabaseAdmin.from('profiles').update({ 
              balance: (p?.balance ?? userProfile.balance) - cost, 
              last_request_at: new Date().toISOString() 
            }).eq('id', userProfile.id);
            
            await ctx.supabaseAdmin.from('logs').insert({ 
              user_id: userProfile.id, 
              model: finalModelId, 
              total_tokens: pTokens + cTokens, 
              cost: cost,
              metadata: { requested: originalModelId, used: finalModelId, provider: usedFallbackProvider ? 'fallback' : 'primary' }
            });
          }
        } else {
          // Sanitize error message to ensure no Chinese/Provider leaks
          if (hasChinese || response.status === 401 || isFailedJson) {
            data = { error: { message: "Neural Matrix synchronization error. Please try a different model or refresh." } };
          }
          return Response.json(data, { status: (response.status >= 200 && response.status < 300) ? 400 : response.status });
        }

        return Response.json(data, { status: response.status });
      }
    } catch (err) { 
      return Response.json({ error: { message: err.message } }, { status: 500 }); 
>>>>>>> f20cb4e (fix: route playground chat through Vercel proxy to resolve CORS fetch errors)
    }
  }),
};
