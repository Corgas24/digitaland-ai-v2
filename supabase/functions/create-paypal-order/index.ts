import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  const environment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox'
  const baseURL = environment === 'sandbox' 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com'
    
  const auth = btoa(`${clientId}:${clientSecret}`)
  
  const response = await fetch(`${baseURL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  })
  
  const data = await response.json()
  return { accessToken: data.access_token, baseURL }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { amount } = await req.json()
    if (!amount || typeof amount !== 'number' || amount < 5) {
      throw new Error('Invalid amount (minimum $5)')
    }

    const { accessToken, baseURL } = await getPayPalAccessToken()

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: `user_${user.id}_${Date.now()}`,
        custom_id: user.id,
        amount: {
          currency_code: "USD",
          value: amount.toFixed(2)
        }
      }]
    }

    const response = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload)
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error_description || 'Failed to create PayPal order')
    }

    return new Response(
      JSON.stringify({ orderID: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
