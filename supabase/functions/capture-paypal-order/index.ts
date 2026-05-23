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
  if (!data.access_token) {
    throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`)
  }
  return { accessToken: data.access_token, baseURL }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { orderID } = await req.json()
    if (!orderID) throw new Error('Missing orderID')

    // Capture the order via PayPal API (server-side)
    const { accessToken, baseURL } = await getPayPalAccessToken()

    const captureResponse = await fetch(`${baseURL}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const captureData = await captureResponse.json()

    if (captureData.status !== 'COMPLETED') {
      throw new Error(`PayPal capture failed: ${captureData.message || captureData.status}`)
    }

    // Extract amount from captured order
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    if (!capture) throw new Error('No capture data found in PayPal response')

    const amount = parseFloat(capture.amount?.value || '0')
    if (amount <= 0) throw new Error('Invalid captured amount')

    // Credit the user's balance using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Could not fetch user profile')

    const newBalance = (profile.balance || 0) + amount

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id)

    if (updateError) throw new Error(`Failed to update balance: ${updateError.message}`)

    console.log(`PayPal: Credited $${amount} to user ${user.id}. New balance: $${newBalance}`)

    return new Response(
      JSON.stringify({ success: true, amount, newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Capture error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
