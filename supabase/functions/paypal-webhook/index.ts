import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyPayPalWebhook(req: Request, rawBody: string): Promise<boolean> {
  try {
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')!
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')!
    const environment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox'
    const baseURL = environment === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'

    // Get access token
    const auth = btoa(`${clientId}:${clientSecret}`)
    const tokenRes = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    if (!accessToken) return false

    // Verify webhook signature via PayPal API
    const verifyPayload = {
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }

    const verifyRes = await fetch(`${baseURL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verifyPayload),
    })

    const verifyData = await verifyRes.json()
    return verifyData.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('Webhook verification error:', err)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const event = JSON.parse(rawBody)

    // Verify the webhook signature
    const isValid = await verifyPayPalWebhook(req, rawBody)
    if (!isValid) {
      console.error('Webhook signature verification failed')
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('PayPal webhook received:', event.event_type)

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource

      let userId = null
      let amountStr = '0'

      if (resource.custom_id) {
        userId = resource.custom_id
        if (resource.amount?.value) {
          amountStr = resource.amount.value
        } else if (resource.seller_receivable_breakdown?.gross_amount?.value) {
          amountStr = resource.seller_receivable_breakdown.gross_amount.value
        }
      } else if (resource.purchase_units?.[0]) {
        userId = resource.purchase_units[0].custom_id
        amountStr = resource.purchase_units[0].amount?.value || '0'
      }

      const amount = parseFloat(amountStr)

      if (userId && amount > 0) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single()

        if (profile) {
          const newBalance = (profile.balance || 0) + amount
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId)

          if (error) {
            console.error('Failed to update balance:', error)
          } else {
            console.log(`Credited $${amount} to user ${userId}. New balance: $${newBalance}`)
          }
        }
      } else {
        console.warn('Webhook missing userId or amount', { userId, amount })
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Webhook Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
