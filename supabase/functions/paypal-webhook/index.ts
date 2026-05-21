import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

serve(async (req) => {
  try {
    const rawBody = await req.text()
    const event = JSON.parse(rawBody)

    // Note: In production, you should verify the webhook signature using your PayPal Webhook ID
    // See PayPal docs on webhook verification for full implementation.

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      
      let userId = null;
      let amountStr = '0';
      
      // Attempt to extract custom_id and amount from the webhook resource payload
      if (resource.custom_id) {
        userId = resource.custom_id;
        if (resource.amount && resource.amount.value) {
            amountStr = resource.amount.value;
        } else if (resource.seller_receivable_breakdown) {
            amountStr = resource.seller_receivable_breakdown.gross_amount.value;
        }
      } else if (resource.purchase_units && resource.purchase_units[0]) {
        userId = resource.purchase_units[0].custom_id;
        amountStr = resource.purchase_units[0].amount.value || resource.purchase_units[0].amount.value;
      }
      
      const amount = parseFloat(amountStr);

      if (userId && amount > 0) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Read current balance
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single()

        if (profile) {
          const newBalance = (profile.balance || 0) + amount;
          
          // Update user balance
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId)

          if (error) {
            console.error('Failed to update balance for user', userId, error)
          } else {
            console.log(`Successfully added $${amount} to user ${userId}. New balance: $${newBalance}`)
          }
        }
      } else {
        console.warn('Webhook payload missing userId or amount', { userId, amount })
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error('Webhook Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
