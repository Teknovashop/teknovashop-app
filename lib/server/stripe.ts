import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  stripe ||= new Stripe(key, {
    apiVersion: "2024-06-20",
    timeout: 15000,
    maxNetworkRetries: 1,
  });
  return stripe;
}