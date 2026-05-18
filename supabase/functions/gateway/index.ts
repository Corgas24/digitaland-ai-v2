// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
// These must be kept in sync with src/data/models.js:
//   MARKUP  — platform profit margin applied to the upstream cost
//   OFF_MUL — multiplier used to reconstruct the "official" list price from
//             the off_in / off_out values stored in the models table.
const MARKUP      = 1.4;
const OFF_MUL     = 1.9;

// The name of the env var that gates admin / billing-exempt access.
// Set this to a random high-entropy string in your Supabase Secrets dashboard
// (never commit it to source control).
const BILLING_EXEMPT_ENV = "GATEWAY_BILLING_EXEMPT_USER_ID";

// ─── PROFIT-CASCADE MAP ───────────────────────────────────────────────────────
// When a model is unavailable, these fallbacks are tried in order.
// Keep in sync with the frontend model catalog so the UI labels match reality.
const CASCADE: Record<string, string[]> = {
  // --- TEXT FRONTIER ---
  'gpt-5':              ['gpt-4.1', 'gpt-4o', 'gpt-5-mini'],
  'gpt-4o':             ['gpt-4o-mini', 'claude-sonnet-4-6', 'llama-3.3-70b'],
  'claude-opus-4-7':    ['claude-sonnet-4-6', 'gpt-4o', 'claude-haiku-4-5'],
  'claude-sonnet-4-6':  ['gpt-4o-mini', 'claude-haiku-4-5', 'llama-3.3-70b'],
  'gemini-3.1-pro':     ['gemini-3-flash', 'gpt-4o-mini'],

  // --- REASONING / RESEARCH ---
  'o1':          ['o1-mini', 'deepseek-r1', 'gpt-4o'],
  'o1-mini':     ['deepseek-r1', 'gpt-4o-mini'],
  'deepseek-r1': ['o1-mini', 'llama-3.3-70b'],
  'deepseek-v3': ['gpt-4o-mini', 'llama-3.3-70b', 'qwen3.6-plus'],

  // --- OPEN SOURCE / LLAMA ---
  'llama-3.1-405b': ['llama-3.3-70b', 'llama-3.1-8b'],
  'llama-3.3-70b':  ['llama-3.1-8b'],

  // --- SPECIALIZED ---
  'mistral-large-3': ['mistral-small-3.1', 'gpt-4o-mini'],
  'qwen3-max':       ['qwen3.6-plus', 'qwen3-mini'],
  'grok-4':          ['grok-4-fast', 'llama-3.3-70b'],

  // --- IMAGE GENERATION ---
  'mj_imagine':   ['dall-e-3',       'flux-pro',       'nano-banana-pro'],
  'dall-e-3':     ['dall-e-2',       'flux-schnell',    'sdxl'],
  'flux-pro':     ['flux-dev',       'flux-schnell',    'sdxl'],

  // --- VIDEO & MULTIMODAL ---
  'runway-gen-3': ['runway-gen-2', 'pika-art',       'veo-3.1'],
  'sora':         ['runway-gen-3', 'runway-gen-2'],

  // --- AUDIO ---
  'whisper-1':    ['whisper-large-v3', 'whisper-medium'],
};

console.info("gateway server started");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Returns the billing-exempt user id from the environment, or null. */
function getBillingExemptId(): string | null {
  return Deno.env.get(BILLING_EXEMPT_ENV) ?? null;
}

/**
 * Atomically deducts `cost` from a user's balance and writes a log row in a
 * **single Postgres transaction** via a Supabase RPC function.
 *
 * Deploy this RPC once in the Supabase SQL Editor:
 *
 *   create or replace function deduct_balance_and_log(
 *     p_user_id      uuid,
 *     p_model        text,
 *     p_tokens_in    bigint,
 *     p_tokens_out   bigint,
 *     p_cost         numeric,
 *     p_meta         jsonb,
 *     p_req          bigint default 20,
 *     p_res          bigint default 40
 *   ) returns void language plpgsql as $$
 *   begin
 *     update profiles
 *       set balance = balance - p_cost,
 *           last_request_at = now()
 *       where id = p_user_id;
 *     insert into logs (user_id, model, total_tokens, cost, metadata)
 *       values (p_user_id, p_model, p_tokens_in + p_tokens_out, p_cost, p_meta);
 *   end; $$;
 *
 * If the function does not exist the code falls back to the legacy read-then-write
 * path so production is not blocked.
 */
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

  // Try the atomic RPC first
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
    console.warn("atomicBill RPC failed, falling back:", error.message);
  } catch (e) {
    console.warn("atomicBill RPC unavailable, falling back:", (e as Error).message);
  }

  // ── Legacy fallback: separate SELECT + UPDATE (non-atomic, race-prone) ────
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();
  await supabaseAdmin
    .from("profiles")
    .update({
      balance:      (p?.balance ?? 0) - cost,
      last_request_at: new Date().toISOString(),
    })
    .eq("id", userId);
  await supabaseAdmin.from("logs").insert({
    user_id:    userId,
    model:      finalModelId,
    total_tokens: tokensIn + tokensOut,
    cost,
    metadata,
  });
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────
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
        // ── 1. AUTHENTICATION ──────────────────────────────────────────────
        let userProfile: { id: string; balance: number; [k: string]: unknown } | null = null;

        // 1a. Supabase-authenticated user (JWT in Authorization header / cookie)
        if (ctx.authType === "user") {
          const userId = ctx.userClaims?.sub;
          if (userId) {
            const { data } = await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .single();
            userProfile = data ?? null;
          }
        }

        // 1b. API-key-authenticated user (x-api-key header for backend clients)
        if (!userProfile) {
          const xApiKey = req.headers.get("x-api-key");
          if (xApiKey) {
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

        // ── 2. CHECK BILLING EXEMPTION ──────────────────────────────────────
        const billingExemptId = getBillingExemptId();
        const isBillingExempt = billingExemptId
          ? userProfile.id === billingExemptId
          : false;

        // ── 3. PARSE REQUEST ────────────────────────────────────────────────
        const incomingBody    = await req.json();
        const originalModelId = incomingBody.model || "gpt-4o-mini";

        if (!!incomingBody.stream) {
          incomingBody.stream_options = { include_usage: true };
        }

        // ── 4. RESOLVE UPSTREAM CREDENTIALS ─────────────────────────────────
        const primaryUrl = Deno.env.get("UPSTREAM_API_URL") ?? "https://crazyrouter.com/v1/chat/completions";
        const primaryKey = Deno.env.get("UPSTREAM_API_KEY") ?? Deno.env.get("UPSTREAM_MASTER_KEY");

        if (!primaryKey) {
          return Response.json(
            { error: { message: "Gateway misconfigured: UPSTREAM_API_KEY is not set." } },
            { status: 500 },
          );
        }

        const fallbackUrl = Deno.env.get("FALLBACK_API_URL") ?? "https://openrouter.ai/api/v1/chat/completions";
        const fallbackKey = Deno.env.get("FALLBACK_API_KEY") ?? Deno.env.get("OPENROUTER_API_KEY");

        // ── 5. LOAD BILLING RATES (use original model; cascaded model rates
        //       are looked up again after the cascade finishes) ───────────────
        const { data: billingModel } = await ctx.supabaseAdmin
          .from("models")
          .select("off_in, off_out")
          .ilike("id", originalModelId)
          .maybeSingle(); // maybeSingle → null when row not found (no error)

        const ratesRaw = billingModel ?? { off_in: 2.0, off_out: 6.0 };
        // Guard against NULL columns: treat them as 0 so the cost formula stays numeric
        const rates = {
          off_in:  (ratesRaw.off_in  ?? 0) as number,
          off_out: (ratesRaw.off_out ?? 0) as number,
        };

        // ── 6. INTELLIGENT ROUTING: CASCADE + FALLBACK ──────────────────────
        //
        // Strategy A — Primary upstream provider with cascade failover
        // Strategy B — Fallback provider (OpenRouter) with cascade failover
        //
        // Proprietary-model guard: if the primary URL resolves to SiliconFlow
        // (which doesn't proxy GPT / Claude / Gemini etc.), skip it for those
        // models and go straight to the fallback provider.

        const isPrimarySiliconFlow   = primaryUrl.includes("siliconflow");
        const proprietaryKeywords    = ["gpt", "claude", "gemini", "o1", "dall-e", "mj_imagine", "sora", "runway"];
        const isProprietaryModel     = proprietaryKeywords.some(k =>
          originalModelId.toLowerCase().includes(k),
        );
        const shouldSkipPrimary      = isPrimarySiliconFlow && isProprietaryModel;

        const tryModels      = [originalModelId, ...(CASCADE[originalModelId] ?? [])];
        let   finalModelId   = originalModelId;
        let   usedFallback   = false;
        let   response:     Response | null = null;

        // ── Strategy A: primary provider ────────────────────────────────────
        if (!shouldSkipPrimary) {
          for (const model of tryModels) {
            try {
              const controller     = new AbortController();
              const timeoutId     = setTimeout(() => controller.abort(), 15_000);

              finalModelId = model;
              const attempt  = await fetch(primaryUrl, {
                method:  "POST",
                headers: {
                  "Content-Type":  "application/json",
                  "Authorization": `Bearer ${primaryKey}`,
                },
                body:    JSON.stringify({ ...incomingBody, model }),
                signal:  controller.signal,
              });

              clearTimeout(timeoutId);

              // 401 / 403 → primary key is dead → jump to fallback immediately
              if (attempt.status === 401 || attempt.status === 403) {
                console.log(`[gateway] Primary auth error (${attempt.status}). Switching to fallback.`);
                break;
              }

              if (attempt.ok) {
                // For non-streaming calls, inspect the body for error / garbage
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
                break; // success
              }
            } catch (e) {
              console.log(`[gateway] Primary ${model} failed:`, (e as Error).message);
            }
          }
        } else {
          console.log(`[gateway] Skipping SiliconFlow for proprietary model ${originalModelId}.`);
        }

        // ── Strategy B: fallback provider ───────────────────────────────────
        if (!response && fallbackKey) {
          usedFallback = true;
          for (const model of tryModels) {
            try {
              finalModelId = model;
              const attempt = await fetch(fallbackUrl, {
                method:  "POST",
                headers: {
                  "Content-Type":  "application/json",
                  "Authorization": `Bearer ${fallbackKey}`,
                  "HTTP-Referer":  "https://digitaland.ai",
                  "X-Title":       "Digitaland AI Gateway",
                },
                body:    JSON.stringify({ ...incomingBody, model }),
              });

              if (attempt.ok) {
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
            } catch (e) {
              console.log(`[gateway] Fallback ${model} failed:`, (e as Error).message);
            }
          }
        }

        // ── 7. NO PROVIDER AVAILABLE ────────────────────────────────────────
        if (!response) {
          return Response.json(
            { error: { message: "All providers exhausted. Please try again later." } },
            { status: 503 },
          );
        }

        // ── 8. LOOK UP BILLING RATES FOR THE ACTUAL MODEL USED ──────────────
        // We re-query with finalModelId so the cost matches the model that
        // actually responded (important when cascade / fallback was triggered).
        if (finalModelId !== originalModelId) {
          const { data: cascadeRates } = await ctx.supabaseAdmin
            .from("models")
            .select("off_in, off_out")
            .ilike("id", finalModelId)
            .maybeSingle();
          if (cascadeRates) {
            rates.off_in  = cascadeRates.off_in  ?? rates.off_in;
            rates.off_out = cascadeRates.off_out ?? rates.off_out;
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
                    const cost = (
                      (totalIn  / 1_000_000 * (rates.off_in  / OFF_MUL))
                    + (totalOut / 1_000_000 * (rates.off_out / OFF_MUL))
                    ) * MARKUP;

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
            const cost   = (
              (pToks / 1_000_000 * (rates.off_in  / OFF_MUL))
            + (cToks / 1_000_000 * (rates.off_out / OFF_MUL))
            ) * MARKUP;

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
