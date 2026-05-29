import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { Redis } from "npm:@upstash/redis";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
// These must be kept in sync with src/data/models.js:
//   MARKUP  — Digitaland markup over the CrazyRouter base price.
//              off_in / off_out in the DB are CrazyRouter prices (not scaled).
//              cost = (pToks/1e6 × off_in + cToks/1e6 × off_out) × MARKUP
//              → Digitaland charges 80% above CrazyRouter per-request cost.
const MARKUP = 1.8;

const MINIMUM_CHARGE: number = (() => {
  const val = Deno.env.get("MINIMUM_CHARGE");
  const n = val ? parseFloat(val) : NaN;
  return Number.isFinite(n) ? n : 0.001;
})();

const BILLING_EXEMPT_ENV = "GATEWAY_BILLING_EXEMPT_USER_ID";

// ─── PROFIT-CASCADE MAP ───────────────────────────────────────────────────────
const CASCADE: Record<string, string[]> = {
  'gpt-5.5':            ['gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-5-mini'],
  'gpt-5':              ['gpt-4.1', 'gpt-4o', 'gpt-5-mini'],
  'gpt-4o':             ['gpt-4o-mini', 'claude-sonnet-4-6', 'llama-3.3-70b'],
  'claude-opus-4-7':    ['claude-sonnet-4-6', 'gpt-4o', 'claude-haiku-4-5'],
  'claude-sonnet-4-6':  ['gpt-4o-mini', 'claude-haiku-4-5', 'llama-3.3-70b'],
  'claude-3-5-sonnet':  ['claude-sonnet-4-6', 'gpt-4o-mini', 'claude-haiku-4-5'],
  'gemini-3.1-pro':     ['gemini-3-flash', 'gpt-4o-mini'],
  'gemini-3-pro':       ['gemini-3-flash', 'gemini-3.1-pro', 'gpt-4o-mini'],
  'gemini-3-flash':     ['gemini-3.1-flash-lite', 'gpt-4o-mini'],
  'gemini-2.5-pro':     ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gpt-4o-mini'],
  'gemini-2.5-flash':   ['gemini-2.5-flash-lite', 'gpt-4o-mini'],
  'gemini-2.5-flash-lite': ['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-4o-mini'],
  'o1':          ['o1-mini', 'deepseek-r1', 'gpt-4o'],
  'o1-mini':     ['deepseek-r1', 'gpt-4o-mini'],
  'deepseek-r1': ['o1-mini', 'llama-3.3-70b'],
  'deepseek-v3': ['gpt-4o-mini', 'llama-3.3-70b', 'qwen3.6-plus'],
  'llama-3.1-405b': ['llama-3.3-70b', 'llama-3.1-8b'],
  'llama-3.3-70b':  ['llama-3.1-8b'],
  'mistral-large-3': ['mistral-small-3.1', 'gpt-4o-mini'],
  'qwen3-max':       ['qwen3.6-plus', 'qwen3-mini'],
  'grok-4':          ['grok-4-fast', 'llama-3.3-70b'],
  'mj_imagine':   ['dall-e-3',       'flux-pro',       'nano-banana-pro'],
  'dall-e-3':     ['dall-e-2',       'flux-schnell',    'sdxl'],
  'flux-pro':     ['flux-dev',       'flux-schnell',    'sdxl'],
  'runway-gen-3': ['runway-gen-2', 'pika-art',       'veo-3.1', 'doubao-seedance-2-0'],
  'sora':         ['runway-gen-3', 'runway-gen-2', 'doubao-seedance-2-0'],
  'veo-3.1':            ['veo-3.1-fast', 'doubao-seedance-2-0'],
  'veo-3.1-fast':       ['doubao-seedance-2-0'],
  'cogvideox':          ['cogvideox-flash', 'doubao-seedance-2-0'],
  'cogvideox-flash':    ['doubao-seedance-2-0'],
  'kling-v3':           ['doubao-seedance-2-0'],
  'kling-v2-6':         ['doubao-seedance-2-0'],
  'qwen-video-max':     ['qwen-video-plus', 'qwen-video-turbo', 'doubao-seedance-2-0'],
  'qwen-video-plus':    ['qwen-video-turbo', 'doubao-seedance-2-0'],
  'qwen-video-turbo':   ['doubao-seedance-2-0'],
  'whisper-1':    ['whisper-large-v3', 'whisper-medium'],
};

console.info("gateway server started");

function getBillingExemptId(): string | null {
  return Deno.env.get(BILLING_EXEMPT_ENV) ?? null;
}

const getBaseUrl = (url: string) => {
  return url.replace(/\/chat\/completions\/?$/, "");
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractUrl(text: string): string | null {
  // Try matching markdown image syntax: ![alt](url)
  const imgRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/;
  const imgMatch = text.match(imgRegex);
  if (imgMatch) return imgMatch[1];

  // Try matching standard markdown link syntax: [text](url)
  const linkRegex = /\[.*?\]\((https?:\/\/[^\s\)]+)\)/;
  const linkMatch = text.match(linkRegex);
  if (linkMatch) return linkMatch[1];

  // Try matching plain URL
  const urlRegex = /(https?:\/\/[^\s\)]+)/;
  const urlMatch = text.match(urlRegex);
  if (urlMatch) return urlMatch[0];

  return null;
}

function mapModelToOpenRouter(modelId: string): string {
  const m = modelId.toLowerCase();
  
  // Image Models
  if (m === "nano-banana") return "google/gemini-2.5-flash-image";
  if (m === "nano-banana-2") return "google/gemini-3.1-flash-image-preview";
  if (m === "nano-banana-pro") return "google/gemini-3-pro-image-preview";
  if (m === "gpt-image-2") return "openai/gpt-5.4-image-2";
  if (m === "dall-e-3") return "openai/gpt-5-image";
  if (m === "dall-e-2") return "openai/gpt-5-image-mini";
  if (m === "sdxl") return "google/gemini-2.5-flash-image"; // fallback
  if (m === "mj_imagine") return "openai/gpt-5-image"; // fallback

  // Chat Models
  if (m === "gpt-4o-mini") return "openai/gpt-4o-mini";
  if (m === "gpt-4o") return "openai/gpt-4o";
  if (m === "gpt-5.5" || m === "gpt-5") return "openai/gpt-5.5";
  if (m === "gpt-5-mini") return "openai/gpt-5.4-mini";
  if (m === "claude-opus-4-7") return "anthropic/claude-opus-4.7-fast";
  if (m === "claude-sonnet-4-6") return "anthropic/claude-3.5-sonnet";
  if (m === "claude-haiku-4-5") return "anthropic/claude-3.5-haiku";
  if (m === "gemini-3.1-pro") return "google/gemini-pro-latest";
  if (m === "gemini-3-flash") return "google/gemini-flash-latest";
  if (m === "gemini-2.5-flash-lite") return "google/gemini-2.5-flash-lite";
  if (m === "gemini-2.5-flash") return "google/gemini-2.5-flash";
  if (m === "gemini-2.5-pro") return "google/gemini-2.5-pro";
  if (m === "deepseek-r1") return "deepseek/deepseek-r1";
  if (m === "deepseek-v3") return "deepseek/deepseek-chat";
  if (m === "llama-3.3-70b") return "meta-llama/llama-3.3-70b-instruct";
  if (m === "llama-3.1-8b") return "meta-llama/llama-3.1-8b-instruct";
  if (m === "mistral-large-3") return "mistralai/mistral-large";
  if (m === "mistral-small-3.1") return "mistralai/mistral-small";
  if (m === "qwen3-max") return "qwen/qwen3.7-max";
  if (m === "qwen3.6-plus") return "qwen/qwen3.5-plus-20260420";
  
  if (m.includes("/")) return modelId;
  return modelId;
}

async function atomicBill(
  supabaseAdmin: ReturnType<typeof import("jsr:@supabase/server@^1").createServerClient>,
  userId:          string,
  finalModelId:    string,
  originalModelId: string,
  usedFallback:    boolean,
  tokensIn:        number,
  tokensOut:       number,
  cost:            number,
): Promise<void> {
  const metadata = {
    requested: originalModelId,
    used: finalModelId,
    provider: usedFallback ? "fallback" : "primary",
  };

  try {
    const { error } = await supabaseAdmin.rpc("deduct_balance_and_log", {
      p_user_id:    userId,
      p_model:      finalModelId,
      p_tokens_in:  tokensIn,
      p_tokens_out: tokensOut,
      p_cost:       cost,
      p_meta:       metadata,
      p_req:        tokensIn  || 20,
      p_res:        tokensOut || 40,
    });
    if (!error) return;
  } catch (e) {
  }

  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();
  const currentBal  = p?.balance ?? 0;
  const newBal      = Math.max(Number(currentBal) - cost, 0);
  const metaPayload = {
    requested: originalModelId,
    used:      finalModelId,
    provider:  usedFallback ? "fallback" : "primary",
  };
  await supabaseAdmin
    .from("profiles")
    .update({ balance: newBal, last_request_at: new Date().toISOString() })
    .eq("id", userId);
  await supabaseAdmin.from("logs").insert({
    user_id:       userId,
    model:         finalModelId,
    total_tokens:  tokensIn + tokensOut,
    cost,
    meta:          metaPayload,
  });
}

export default {
  fetch: withSupabase(
    {
      auth:       ["user", "none"],
      cors: {
        "Access-Control-Allow-Origin":      "*",
        "Access-Control-Allow-Headers":     "authorization, x-client-info, apikey, content-type, x-api-key",
        "Access-Control-Allow-Methods":     "POST, GET, OPTIONS, PUT, DELETE",
      },
    },
    async (req, ctx) => {
      try {
        // ── RATE LIMITING (UPSTASH REDIS) ─────────────────────────────────
        const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
        const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
        if (redisUrl && redisToken) {
          try {
            const redis = new Redis({ url: redisUrl, token: redisToken });
            const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown_ip";
            const key = `rate_limit:${ip}`;
            const requests = await redis.incr(key);
            if (requests === 1) {
              await redis.expire(key, 60); // 1 minute window
            }
            if (requests > 50) {
              return Response.json({ error: { message: "Too many requests. Rate limit: 50/min. Please slow down." } }, { status: 429 });
            }
          } catch (e) {
            console.warn("Redis rate limit error:", e);
          }
        }

        // ── 1. AUTHENTICATION ──────────────────────────────────────────────
        let userProfile: { id: string; balance: number; [k: string]: unknown } | null = null;

        const userId = ctx.userClaims?.sub || (ctx as any).jwtClaims?.sub;
        if (userId) {
          const { data } = await ctx.supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          userProfile = data ?? null;
        }

        if (!userProfile) {
          const xApiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
          if (xApiKey) {
            // Validate the key format using a robust regex to prevent any SQL or JSON syntax injections
            if (!/^sk-dg-[a-zA-Z0-9]{20,64}$/.test(xApiKey)) {
              return Response.json(
                { error: { message: "Unauthorized: Invalid API key format." } },
                { status: 401 },
              );
            }
            const { data } = await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .filter("api_keys", "cs", `[{"key":"${xApiKey}"}]`)
              .single();
            userProfile = data ?? null;
          }
        }

        if (!userProfile) {
          return Response.json(
            { error: { message: "Unauthorized." } },
            { status: 401 },
          );
        }

        // ── 2. CHECK BILLING EXEMPTION & BALANCE ────────────────────────────
        const billingExemptId = getBillingExemptId();
        const isAdmin         = userProfile.is_admin === true;
        const isBillingExempt = (billingExemptId ? userProfile.id === billingExemptId : false) || isAdmin;

        // ── 2b. LIGHTWEIGHT DATABASE-BACKED RATE LIMITING ───────────────────
        if (!isBillingExempt) {
          if (userProfile.last_request_at) {
            const lastReqTime = new Date(userProfile.last_request_at as string).getTime();
            const now = Date.now();
            if (now - lastReqTime < 300) { // Reject if under 300ms (3.33 requests/sec threshold per user)
              return Response.json(
                { error: { message: "Too many concurrent requests. Rate limit exceeded." } },
                { status: 429 },
              );
            }
          }
          // Update last_request_at pre-flight to prevent race-condition balance-drain exploits
          await ctx.supabaseAdmin
            .from("profiles")
            .update({ last_request_at: new Date().toISOString() })
            .eq("id", userProfile.id);
        }

        // ── 2c. PRE-FLIGHT BALANCE ENFORCEMENT ──────────────────────────────
        if (!isBillingExempt && (!userProfile.balance || Number(userProfile.balance) <= 0.001)) {
          return Response.json(
            { error: { message: "insufficient_funds: O teu saldo acabou. Por favor carrega a conta no Dashboard para continuar a usar a API." } },
            { status: 402 }, // 402 Payment Required
          );
        }

        // ── 3. PARSE & SANITIZE REQUEST ──────────────────────────────────────
        const cloneReq = req.clone();
        let incomingBody: any = {};
        const urlObj = new URL(req.url);
        const isImageGenerationEndpoint = urlObj.pathname.endsWith("/images/generations");
        const isImageEditEndpoint = urlObj.pathname.endsWith("/images/edits");
        
        let isMultipart = false;
        let contentTypeHeader = req.headers.get("content-type") || "";
        if (contentTypeHeader.includes("multipart/form-data")) {
          isMultipart = true;
        }

        const bodyBuffer = isMultipart ? await req.clone().arrayBuffer() : null;

        if (isMultipart) {
          try {
            const formData = await cloneReq.formData();
            incomingBody = {
              model: formData.get("model") as string || "dall-e-2",
            };
          } catch (_) {}
        } else {
          let rawBody;
          try {
            rawBody = await cloneReq.json();
          } catch {
            return Response.json(
              { error: { message: "Invalid JSON body in request." } },
              { status: 400 },
            );
          }

          const originalModelId = rawBody.model || "gpt-4o-mini";

          // Sanitize body to copy only safe parameters, blocking arbitrary parameter injections
          const sanitizedBody: Record<string, unknown> = {
            model: originalModelId,
          };

          if (Array.isArray(rawBody.messages)) {
            sanitizedBody.messages = rawBody.messages;
          }
          if (typeof rawBody.stream === "boolean") {
            sanitizedBody.stream = rawBody.stream;
          }
          if (typeof rawBody.temperature === "number") {
            sanitizedBody.temperature = Math.max(0, Math.min(2, rawBody.temperature));
          }
          if (typeof rawBody.max_tokens === "number") {
            sanitizedBody.max_tokens = rawBody.max_tokens;
          }
          if (typeof rawBody.top_p === "number") {
            sanitizedBody.top_p = rawBody.top_p;
          }
          if (typeof rawBody.frequency_penalty === "number") {
            sanitizedBody.frequency_penalty = rawBody.frequency_penalty;
          }
          if (typeof rawBody.presence_penalty === "number") {
            sanitizedBody.presence_penalty = rawBody.presence_penalty;
          }
          if (typeof rawBody.response_format === "object" && rawBody.response_format !== null) {
            sanitizedBody.response_format = rawBody.response_format;
          }
          if (typeof rawBody.prompt === "string") {
            sanitizedBody.prompt = rawBody.prompt;
          }
          if (typeof rawBody.n === "number") {
            sanitizedBody.n = rawBody.n;
          }
          if (typeof rawBody.size === "string") {
            sanitizedBody.size = rawBody.size;
          }

          if (sanitizedBody.stream) {
            sanitizedBody.stream_options = { include_usage: true };
          }
          
          incomingBody = sanitizedBody;
        }

        const originalModelId = incomingBody.model || "gpt-4o-mini";

        // ── 4. RESOLVE UPSTREAM CREDENTIALS ─────────────────────────────────
        const primaryUrl = Deno.env.get("UPSTREAM_API_URL") ?? "https://crazyrouter.com/v1/chat/completions";
        const primaryKey = Deno.env.get("UPSTREAM_API_KEY") ?? Deno.env.get("UPSTREAM_MASTER_KEY");

        const fallbackUrl = null;
        const fallbackKey = null;

        if (!primaryKey) {
          return Response.json(
            { error: { message: "Gateway misconfigured: UPSTREAM_API_KEY is not set." } },
            { status: 500 },
          );
        }

        if (!!incomingBody.stream) {
          incomingBody.stream_options = { include_usage: true };
        }

        // ── 5. LOAD BILLING RATES (use original model; cascaded model rates
        //       are looked up again after the cascade finishes) ───────────────
        const { data: billingModel } = await ctx.supabaseAdmin
          .from("models")
          .select("off_in, off_out, type")
          .ilike("id", originalModelId)
          .maybeSingle(); // maybeSingle → null when row not found (no error)

        const ratesRaw = billingModel ?? { off_in: 2.0, off_out: 6.0, type: "Chat" };
        // Guard against NULL columns: treat them as 0 so the cost formula stays numeric
        const rates = {
          off_in:  (ratesRaw.off_in  ?? 0) as number,
          off_out: (ratesRaw.off_out ?? 0) as number,
        };

        const isImage = isImageGenerationEndpoint || isImageEditEndpoint || ratesRaw.type === "Image";
        const isVideo = ratesRaw.type === "Video";
        const isImageEdit = isImageEditEndpoint;
        const isChatCompletionsRequest = !isImageGenerationEndpoint && !isImageEditEndpoint;

        let bodyToSend = { ...incomingBody };
        if (isImage || isVideo) {
          // Translate chat payload to image/video payload
          if (incomingBody.messages && !incomingBody.prompt) {
            const prompt = incomingBody.messages?.[incomingBody.messages.length - 1]?.content || "";
            bodyToSend = {
              model: originalModelId,
              prompt: prompt,
              ...(incomingBody.n ? { n: incomingBody.n } : {}),
              ...(incomingBody.size ? { size: incomingBody.size } : {}),
              ...(incomingBody.response_format ? { response_format: incomingBody.response_format } : {}),
            };
          }
          if (isVideo) {
            bodyToSend.resolution = bodyToSend.resolution || bodyToSend.size || "720p";
            bodyToSend.duration = bodyToSend.duration || 4;
          }
        }

        const getHeaders = (key: string, isFallback: boolean) => {
          const headers: Record<string, string> = {
            "Authorization": `Bearer ${key}`,
          };
          if (isMultipart) {
            headers["Content-Type"] = contentTypeHeader;
          } else {
            headers["Content-Type"] = "application/json";
          }
          if (isFallback) {
            headers["HTTP-Referer"] = "https://digitaland.ai";
            headers["X-Title"] = "Digitaland AI Gateway";
          }
          return headers;
        };

        // ── 6. INTELLIGENT ROUTING: CASCADE + FALLBACK ──────────────────────
        //
        // Exclusively routing through primary upstream provider (CrazyRouter) with cascade failover.
        // SiliconFlow bypass is kept for compatibility if the upstream URL is customized.

        const shouldSkipPrimary      = false;

        const tryModels      = [originalModelId, ...(CASCADE[originalModelId] ?? [])];
        let   finalModelId   = originalModelId;
        const usedFallback   = false;
        let   response:     Response | null = null;
        let   mediaUrlResult: string | null = null;
        const errorsList: string[] = [];

        // ── Primary provider ────────────────────────────────────────────────
        if (!shouldSkipPrimary) {
          for (const model of tryModels) {
            try {

              finalModelId = model;
              let attempt: Response;

              if (isImageEdit) {
                const targetUrl = getBaseUrl(primaryUrl) + "/images/edits";
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30_000);
                attempt = await fetch(targetUrl, {
                  method: "POST",
                  headers: getHeaders(primaryKey, false),
                  body: bodyBuffer,
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
              } else if (isImage) {
                const targetUrl = getBaseUrl(primaryUrl) + "/images/generations";
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30_000);
                attempt = await fetch(targetUrl, {
                  method: "POST",
                  headers: getHeaders(primaryKey, false),
                  body: JSON.stringify({ ...bodyToSend, model }),
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
              } else if (isVideo) {
                const targetUrl = getBaseUrl(primaryUrl) + "/video/generations";
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout for video generation
                const mappedModel = model === "doubao-seedance-2-0" ? "doubao-seedance-2-0-fast" : model;
                console.log(`[gateway] Submitting video request to ${targetUrl} for model ${model} (mapped to ${mappedModel})`);
                attempt = await fetch(targetUrl, {
                  method: "POST",
                  headers: getHeaders(primaryKey, false),
                  body: JSON.stringify({ ...bodyToSend, model: mappedModel }),
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
              } else {
                // Standard Chat
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15_000);
                attempt = await fetch(primaryUrl, {
                  method:  "POST",
                  headers: getHeaders(primaryKey, false),
                  body:    JSON.stringify({ ...incomingBody, model }),
                  signal:  controller.signal,
                });
                clearTimeout(timeoutId);
              }

              if (attempt.status === 401 || attempt.status === 403) {
                const text = await attempt.clone().text().catch(() => "");
                console.log(`[gateway] Primary auth/quota error (${attempt.status}): ${text}`);
                errorsList.push(`Primary ${model} status ${attempt.status}: ${text}`);
                
                // If it's a true invalid key/token, break the cascade (no use trying other models)
                if (text.includes("无效") || text.includes("token") || text.includes("key") || text.includes("unauthorized") || text.includes("auth")) {
                  break;
                }
                // Otherwise, continue the cascade to allow other models to be tried
                continue;
              }
              if (!attempt.ok) {
                const text = await attempt.clone().text().catch(() => "");
                errorsList.push(`Primary ${model} status ${attempt.status}: ${text}`);
              }

              if (attempt.ok) {
                if (isImage || isImageEdit) {
                  const clone = attempt.clone();
                  const json = await clone.json().catch(() => ({}));
                  const url = json.data?.[0]?.url;
                  if (!url) {
                    console.log(`[gateway] Primary image generation returned no URL for ${model}, trying next cascade model.`);
                    continue;
                  }
                  mediaUrlResult = url;
                  response = attempt;
                  break;
                } else if (isVideo) {
                  const submitJson = await attempt.clone().json().catch(() => ({}));
                  const directUrl = submitJson.data?.[0]?.url || submitJson.url || submitJson.result?.url;
                  
                  if (directUrl) {
                    mediaUrlResult = directUrl;
                    response = attempt;
                    break;
                  }

                  const requestId = submitJson.requestId || submitJson.request_id || submitJson.id || submitJson.task_id;
                  if (!requestId) {
                    console.log(`[gateway] Primary video submission failed to return requestId/directUrl for ${model}, trying next.`);
                    continue;
                  }
                  
                  // Server-side polling loop for primary (supports both CrazyRouter GET and SiliconFlow POST)
                  let pollSuccess = false;
                  const statusUrlGet = getBaseUrl(primaryUrl) + "/video/generations/" + requestId;
                  const statusUrlPost = getBaseUrl(primaryUrl) + "/video/status";

                  for (let i = 0; i < 30; i++) {
                    await delay(3000); // 3 seconds interval for video generation
                    try {
                      // Try GET status first (CrazyRouter style)
                      let pollRes = await fetch(statusUrlGet, {
                        method: "GET",
                        headers: {
                          "Authorization": `Bearer ${primaryKey}`,
                        },
                      });

                      // If GET fails or returns 404/405, fallback to POST status (SiliconFlow style)
                      if (!pollRes.ok || pollRes.status === 404 || pollRes.status === 405) {
                        pollRes = await fetch(statusUrlPost, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${primaryKey}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ requestId }),
                        });
                      }

                      if (pollRes.ok) {
                        const statusJson = await pollRes.json();
                        // CrazyRouter wraps status in statusJson.data.status, SiliconFlow uses statusJson.status
                        const status = statusJson.data?.status || statusJson.status;
                        const progress = statusJson.data?.progress || statusJson.progress || "";
                        console.log(`[gateway] Video generation polling status: ${status} (Progress: ${progress})`);

                        if (status === "SUCCESS" || status === "succeeded" || status === "Succeed") {
                          const url = statusJson.data?.data?.video_url || statusJson.data?.video_url || statusJson.result?.video || statusJson.result?.url || statusJson.data?.[0]?.url || statusJson.url;
                          if (url) {
                            mediaUrlResult = url;
                            pollSuccess = true;
                            break;
                          }
                        } else if (status === "FAILED" || status === "failed" || status === "Failed") {
                          console.log(`[gateway] Video generation failed on upstream status:`, statusJson);
                          break;
                        }
                      } else {
                        console.log(`[gateway] Polling returned status ${pollRes.status}`);
                      }
                    } catch (e) {
                      console.log(`[gateway] Error polling video status:`, e);
                    }
                  }
                  if (pollSuccess && mediaUrlResult) {
                    response = attempt;
                    break;
                  } else {
                    console.log(`[gateway] Video polling failed or timed out for ${model}, trying next cascade.`);
                    continue;
                  }
                } else {
                  // Non-streaming / standard chat checks
                  if (!incomingBody.stream) {
                    const clone  = attempt.clone();
                    const json   = await clone.json().catch(() => ({}));
                    const text   = JSON.stringify(json);
                    const bad    = /[\u4e00-\u9fa5]/.test(text)
                      || json.error
                      || json.err
                      || json.success === false
                      || (json.code && json.code !== 0);
                    if (bad) {
                      console.log(`[gateway] Primary returned error for ${model}, trying next cascade model.`);
                      continue;
                    }
                  }
                  response = attempt;
                  break;
                }
              }
            } catch (e) {
              console.log(`[gateway] Primary ${model} failed:`, (e as Error).message);
              errorsList.push(`Primary ${model} failed: ${(e as Error).message}`);
            }
          }
        } else {
          console.log(`[gateway] Skipping SiliconFlow for proprietary model ${originalModelId}.`);
        }
<<<<<<< Updated upstream

        // ── Strategy B: fallback provider ───────────────────────────────────
        if (!response && fallbackKey) {
          usedFallback = true;
          for (const model of tryModels) {
            try {
              finalModelId = model;
              let attempt: Response;

              if (isImageEdit) {
                const targetUrl = getBaseUrl(fallbackUrl) + "/images/edits";
                attempt = await fetch(targetUrl, {
                  method: "POST",
                  headers: getHeaders(fallbackKey, true),
                  body: bodyBuffer,
                });
              } else if (isImage) {
                const targetUrl = getBaseUrl(fallbackUrl) + "/images/generations";
                const isOR = targetUrl.includes("openrouter.ai") || fallbackUrl.includes("openrouter.ai");
                if (isOR) {
                  const orChatUrl = "https://openrouter.ai/api/v1/chat/completions";
                  const promptText = bodyToSend.prompt || "";
                  attempt = await fetch(orChatUrl, {
                    method: "POST",
                    headers: getHeaders(fallbackKey, true),
                    body: JSON.stringify({
                      model: mapModelToOpenRouter(model),
                      messages: [{ role: "user", content: promptText }]
                    }),
                  });
                } else {
                  attempt = await fetch(targetUrl, {
                    method: "POST",
                    headers: getHeaders(fallbackKey, true),
                    body: JSON.stringify({ ...bodyToSend, model }),
                  });
                }
              } else if (isVideo) {
                const targetUrl = "https://openrouter.ai/api/v1/videos";
                attempt = await fetch(targetUrl, {
                  method: "POST",
                  headers: getHeaders(fallbackKey, true),
                  body: JSON.stringify({ ...bodyToSend, model }),
                });
              } else {
                // Standard Chat
                const isOR = fallbackUrl.includes("openrouter.ai");
                attempt = await fetch(fallbackUrl, {
                  method:  "POST",
                  headers: getHeaders(fallbackKey, true),
                  body:    JSON.stringify({ ...incomingBody, model: isOR ? mapModelToOpenRouter(model) : model }),
                });
              }

              if (!attempt.ok) {
                const text = await attempt.clone().text().catch(() => "");
                errorsList.push(`Fallback ${model} status ${attempt.status}: ${text}`);
              }

              if (attempt.ok) {
                if (isImage || isImageEdit) {
                  const clone = attempt.clone();
                  const json = await clone.json().catch(() => ({}));
                  let url = json.data?.[0]?.url;
                  
                  const targetUrl = getBaseUrl(fallbackUrl) + "/images/generations";
                  const isOR = targetUrl.includes("openrouter.ai") || fallbackUrl.includes("openrouter.ai");
                  if (!url && isOR) {
                    const content = json.choices?.[0]?.message?.content || "";
                    url = extractUrl(content);
                  }

                  if (!url) {
                    console.log(`[gateway] Fallback image generation returned no URL for ${model}, trying next cascade model.`);
                    continue;
                  }
                  mediaUrlResult = url;
                  if (!json.data) {
                    response = new Response(JSON.stringify({ data: [{ url: mediaUrlResult }] }), {
                      status: 200,
                      headers: { "Content-Type": "application/json" }
                    });
                  } else {
                    response = attempt;
                  }
                  break;
                } else if (isVideo) {
                  const submitJson = await attempt.clone().json().catch(() => ({}));
                  const job = submitJson.id || submitJson.requestId || submitJson.request_id;
                  if (!job) {
                    console.log(`[gateway] Fallback video submission failed to return job ID for ${model}, trying next.`);
                    continue;
                  }
                  
                  // Server-side polling loop for OpenRouter
                  let pollSuccess = false;
                  const statusUrl = `https://openrouter.ai/api/v1/videos/${job}`;
                  for (let i = 0; i < 30; i++) {
                    await delay(2000);
                    try {
                      const pollRes = await fetch(statusUrl, {
                        method: "GET",
                        headers: {
                          "Authorization": `Bearer ${fallbackKey}`,
                        },
                      });
                      if (pollRes.ok) {
                        const statusJson = await pollRes.json();
                        const status = statusJson.status;
                        if (status === "completed") {
                          const url = statusJson.response?.data?.[0]?.url || statusJson.data?.[0]?.url || statusJson.url;
                          if (url) {
                            mediaUrlResult = url;
                            pollSuccess = true;
                            break;
                          }
                        } else if (status === "failed") {
                          console.log(`[gateway] Video generation failed on fallback status:`, statusJson);
                          break;
                        }
                      }
                    } catch (e) {
                      console.log(`[gateway] Error polling fallback video status:`, e);
                    }
                  }
                  if (pollSuccess && mediaUrlResult) {
                    response = attempt;
                    break;
                  } else {
                    console.log(`[gateway] Video polling failed or timed out for ${model}, trying next fallback cascade.`);
                    continue;
                  }
                } else {
                  if (!incomingBody.stream) {
                    const clone = attempt.clone();
                    const json  = await clone.json().catch(() => ({}));
                    const text  = JSON.stringify(json);
                    const bad   = /[\u4e00-\u9fa5]/.test(text)
                      || json.error
                      || json.err
                      || json.success === false
                      || (json.code && json.code !== 0);
                    if (bad) continue;
                  }
                  response = attempt;
                  break;
                }
              }
            } catch (e) {
              console.log(`[gateway] Fallback ${model} failed:`, (e as Error).message);
              errorsList.push(`Fallback ${model} failed: ${(e as Error).message}`);
            }
          }
        }

        // ── 7. NO PROVIDER AVAILABLE ────────────────────────────────────────
        if (!response) {
          return Response.json(
            { error: { message: "All providers exhausted. Please try again later.", details: errorsList } },
            { status: 503 },
          );
        }

        // ── 8. LOOK UP BILLING RATES FOR THE ACTUAL MODEL USED ──────────────
        // We re-query with finalModelId so the cost matches the model that
        // actually responded (important when cascade / fallback was triggered).
        if (finalModelId !== originalModelId) {
          const { data: cascadeRates } = await ctx.supabaseAdmin
            .from("models")
            .select("off_in, off_out, type")
            .ilike("id", finalModelId)
            .maybeSingle();
          if (cascadeRates) {
            rates.off_in  = cascadeRates.off_in  ?? rates.off_in;
            rates.off_out = cascadeRates.off_out ?? rates.off_out;
          }
        }

        // ── 7.5 MEDIA RESOLUTION AND BILLING ─────────────────────────────────
        if ((isImage || isVideo) && mediaUrlResult) {
          // If requested via Chat Completions, wrap in a Chat Completions response
          if (isChatCompletionsRequest) {
            const chatResponse = {
              id: "chatcmpl-" + Math.random().toString(36).substring(2),
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: finalModelId,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: isVideo 
                      ? `Aqui está o seu vídeo gerado:\n[Ver Vídeo](${mediaUrlResult})`
                      : `Aqui está a sua imagem gerada:\n![Imagem Gerada](${mediaUrlResult})`
                  },
                  finish_reason: "stop"
                }
              ],
              usage: {
                prompt_tokens: 20,
                completion_tokens: 40,
                total_tokens: 60
              }
            };

            if (!isBillingExempt) {
              const cost = Math.max(rates.off_in * MARKUP, MINIMUM_CHARGE);
              try {
                await atomicBill(
                  ctx.supabaseAdmin,
                  userProfile.id,
                  finalModelId,
                  originalModelId,
                  usedFallback,
                  20,
                  40,
                  cost,
                );
              } catch (e) {
                console.error("[gateway] BILLING ERROR:", e);
              }
            }
            return Response.json(chatResponse);
          } else {
            // Direct endpoint response
            const directResponse = {
              created: Math.floor(Date.now() / 1000),
              data: [
                {
                  url: mediaUrlResult
                }
              ]
            };

            if (!isBillingExempt) {
              const cost = Math.max(rates.off_in * MARKUP, MINIMUM_CHARGE);
              try {
                await atomicBill(
                  ctx.supabaseAdmin,
                  userProfile.id,
                  finalModelId,
                  originalModelId,
                  usedFallback,
                  20,
                  40,
                  cost,
                );
              } catch (e) {
                console.error("[gateway] BILLING ERROR:", e);
              }
            }
            return Response.json(directResponse);
          }
        }
        // ── 9. STREAMING RESPONSE ───────────────────────────────────────────
        const contentType = response.headers.get("content-type") ?? "";
        const isStream    = incomingBody.stream
          && response.ok
          && contentType.includes("text/event-stream");

        if (isStream) {
          const reader      = response.body!.getReader();
          const decoder     = new TextDecoder();
          let   promptToks  = 0;
          let   complToks   = 0;

          const stream = new ReadableStream({
            async start(ctrl: ReadableStreamDefaultController) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });

                  // Extract token usage metadata from SSE chunks
                  if (chunk.includes('"usage"')) {
                    for (const part of chunk.split("data: ")) {
                      const trimmed = part.trim();
                      if (!trimmed || trimmed === "[DONE]") continue;
                      try {
                        const parsed = JSON.parse(trimmed);
                        const usage   = parsed.usage ?? parsed.x_deepseek_usage ?? parsed.openrouter_usage;
                        if (usage) {
                          promptToks = usage.prompt_tokens ?? promptToks;
                          complToks  = usage.completion_tokens ?? complToks;
                        }
                      } catch { /* keep going */ }
                    }
                  }
                  ctrl.enqueue(value);
                }
              } finally {
                ctrl.close();
                if (!isBillingExempt) {
                  try {
                    const totalIn  = promptToks || 1;
                    const totalOut = complToks  || 1;
                    // off_in / off_out = CrazyRouter raw price per 1M tokens.
                    // MARKUP = 1.8 is applied directly (no OFF_MUL division).
                    const cost = Math.max(
                      ((totalIn  / 1_000_000 * rates.off_in)
                    + (totalOut / 1_000_000 * rates.off_out))
                    * MARKUP,
                      MINIMUM_CHARGE
                    );

                    await atomicBill(
                      ctx.supabaseAdmin,
                      userProfile.id,
                      finalModelId,
                      originalModelId,
                      usedFallback,
                      totalIn,
                      totalOut,
                      cost,
                    );
                  } catch (e) {
                    console.error("[gateway] BILLING ERROR:", e);
                  }
                }
              }
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
        }

        // ── 10. NON-STREAMING RESPONSE ─────────────────────────────────────
        let data: Record<string, unknown>;
        try {
          data = await response.json();
        } catch {
          const text = await response.clone().text();
          data = { choices: [{ message: { content: text } }] };
        }

        const raw       = JSON.stringify(data);
        const hasChinese = /[\u4e00-\u9fa5]/.test(raw);
        const hasError  = !!(data.error || data.err || data.success === false || (data.code && data.code !== 0));

        if (!hasError && !hasChinese && response.ok) {
          if (!isBillingExempt) {
            const usage  = data.usage ?? data.x_deepseek_usage ?? data.openrouter_usage;
            const pToks  = (usage?.prompt_tokens      ?? 1) as number;
            const cToks  = (usage?.completion_tokens  ?? 1) as number;
            // off_in / off_out = CrazyRouter base price per 1M tokens.
            // MARKUP = 1.8 applied directly here (no OFF_MUL divisor).
            const cost   = Math.max(
              ((pToks / 1_000_000 * rates.off_in)
            + (cToks / 1_000_000 * rates.off_out))
            * MARKUP,
              MINIMUM_CHARGE
            );

            try {
              await atomicBill(
                ctx.supabaseAdmin,
                userProfile.id,
                finalModelId,
                originalModelId,
                usedFallback,
                pToks,
                cToks,
                cost,
              );
            } catch (e) {
              console.error("[gateway] BILLING ERROR:", e);
            }
          }
          return Response.json(data, { status: response.status });
        }

        // Provider returned an error — sanitise and forward
        if (hasChinese || response.status === 401 || hasError) {
          data = { error: { message: "Neural Matrix synchronization error. Please try a different model or refresh." } };
        }
        return Response.json(data, { status: response.status });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: { message: msg } }, { status: 500 });
      }
    },
  ),
};
