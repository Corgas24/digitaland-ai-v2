import { loadStripe } from '@stripe/stripe-js';

// Get your Publishable Key from the Stripe Dashboard: https://dashboard.stripe.com/apikeys
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'your_pk_test_placeholder_here';

let stripePromise;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};
