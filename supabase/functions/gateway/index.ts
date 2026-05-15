
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const MARKUP = 1.4;

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      let userProfile = null;
      const authHeader = req.headers.get('Authorization');
      const xApiKey = req.headers.get('x-api-key');

      // 1. Auth Identification
      if (authHeader && authHeader.startsWith('Bearer ')) {
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

      if (!userProfile) {
        return new Response(JSON.stringify({ error: { message: "Unauthorized. Please sign in or provide a valid API key." } }), { 
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 2. Billing Check
      if (userProfile.balance <= 0) {
        return new Response(JSON.stringify({ error: { message: "Insufficient Neural Credits." } }), { 
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 3. Prepare Upstream Request
      const incomingBody = await req.json();
      const upstreamKey = Deno.env.get('CRAZYROUTER_API_KEY') || Deno.env.get('UPSTREAM_MASTER_KEY');
      const upstreamUrl = Deno.env.get('UPSTREAM_API_URL') || "https://api.openai.com/v1/chat/completions";

      // Enable usage tracking for streams if possible
      if (incomingBody.stream) {
        incomingBody.stream_options = { include_usage: true };
      }

      const response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${upstreamKey}`,
          'HTTP-Referer': 'https://digitaland.ai',
          'X-Title': 'Digitaland AI'
        },
        body: JSON.stringify(incomingBody)
      });

      // 4. Handle Streaming Response
      if (incomingBody.stream && response.ok) {
        return new Response(response.body, { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
          } 
        });
      }

      // 5. Handle Non-Streaming Response
      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: { message: `Neural Engine Error: ${data.error?.message || response.statusText}` } 
        }), { 
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 6. Final Billing for Non-Streaming
      if (data.usage) {
        const { total_tokens } = data.usage;
        const finalCost = (total_tokens / 1000) * 0.002 * MARKUP; // Fallback calculation
        
        await supabaseAdmin.from('profiles').update({ 
          balance: userProfile.balance - finalCost,
          last_request_at: new Date().toISOString()
        }).eq('id', userProfile.id);

        await supabaseAdmin.from('logs').insert({
          user_id: userProfile.id, 
          model: incomingBody.model, 
          total_tokens, 
          cost: finalCost, 
          status: 'success'
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: { message: err.message } }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }
}
