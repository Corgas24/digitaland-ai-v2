import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
  const environment = Deno.env.get('PAYPAL_ENVIRONMENT') ?? 'sandbox'

  return new Response(
    JSON.stringify({ clientId, environment }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
