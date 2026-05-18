import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

console.info("stripe-webhook started");

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

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

        // Fetch user's current balance using supabaseAdmin from context (bypasses RLS)
        const { data: profile, error: profileError } = await ctx.supabaseAdmin
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single()

        if (profileError) throw profileError

        // Update the user's balance
        const newBalance = (profile.balance || 0) + amountPaid
        const { error: updateError } = await ctx.supabaseAdmin
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId)

        if (updateError) throw updateError

        // Log the transaction for transparency
        await ctx.supabaseAdmin.from('transactions').insert({
          user_id: userId,
          amount: amountPaid,
          description: `Credits Top-up ($${amountPaid})`,
          stripe_session_id: session.id,
          status: 'completed'
        });

        console.log(`Successfully added $${amountPaid} to user ${userId} and logged transaction.`)
      }

      return Response.json({ received: true }, { status: 200 })

    } catch (error) {
      console.error('Webhook handler failed:', error.message)
      return Response.json({ error: error.message }, { status: 400 })
    }
  }),
};
