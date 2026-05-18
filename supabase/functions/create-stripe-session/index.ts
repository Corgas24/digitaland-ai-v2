import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

console.info("create-stripe-session started");

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
        apiVersion: '2022-11-15',
        httpClient: Stripe.createFetchHttpClient(),
      })

      const { amount, userId } = await req.json()

      // 1. Create a Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { 
              name: 'Digitaland AI Credits',
              description: `Purchase of ${amount} API credits for Digitaland.ai`
            },
            unit_amount: amount * 100, // Stripe expects cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.get('origin')}/dashboard/billing?success=true`,
        cancel_url: `${req.headers.get('origin')}/dashboard/billing?canceled=true`,
        metadata: { userId },
      })

      return Response.json({ sessionId: session.id, url: session.url }, { status: 200 })

    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }
  }),
};
