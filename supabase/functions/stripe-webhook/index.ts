import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

// Define the Stripe instance
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature provided', { status: 400 })
  }

  try {
    const body = await req.text()
    // Verify the webhook signature
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret!)
    } catch (err) {
      console.error(`⚠️  Webhook signature verification failed.`, err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata.userId
      const amountPaidInCents = session.amount_total
      const amountPaid = amountPaidInCents / 100

      // Create Supabase client with Service Role key to bypass RLS
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Fetch user's current balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Update the user's balance
      const newBalance = (profile.balance || 0) + amountPaid
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId)

      if (updateError) throw updateError

      // Log the transaction for transparency
      await supabase.from('transactions').insert({
        user_id: userId,
        amount: amountPaid,
        description: `Credits Top-up ($${amountPaid})`,
        stripe_session_id: session.id,
        status: 'completed'
      });

      console.log(`Successfully added $${amountPaid} to user ${userId} and logged transaction.`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('Webhook handler failed:', error.message)
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }
})
