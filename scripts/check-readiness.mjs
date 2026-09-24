#!/usr/bin/env node
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_BACKEND_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ONEOFF",
  "STRIPE_PRICE_MAKER",
  "STRIPE_PRICE_COMMERCIAL",
];

const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";
const failures = [];
const warnings = [];

const cleanUrl = (value) => String(value || "").replace(/\/+$/, "");
const ok = (message) => console.log(`ok  ${message}`);
const fail = (message) => {
  failures.push(message);
  console.error(`err ${message}`);
};
const warn = (message) => {
  warnings.push(message);
  console.warn(`warn ${message}`);
};

for (const name of required) {
  if (!process.env[name]) fail(`Missing env var ${name}`);
}

try {
  const backend = cleanUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  if (backend) {
    const res = await fetch(`${backend}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error(`backend /health returned ${res.status}`);
    ok("Render backend health endpoint responds");
  }
} catch (error) {
  fail(error?.message || String(error));
}

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    for (const table of ["designs", "entitlements", "orders", "download_events", "stripe_events"]) {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error) throw new Error(`Supabase table ${table}: ${error.message}`);
    }
    ok("Supabase commerce tables are reachable with service role");

    const { data, error } = await supabase.storage.getBucket(bucket);
    if (error) throw new Error(`Supabase bucket ${bucket}: ${error.message}`);
    if (data?.public) warn(`Supabase bucket ${bucket} is public; production STL storage should be private`);
    else ok(`Supabase bucket ${bucket} exists and is private`);
  }
} catch (error) {
  fail(error?.message || String(error));
}

try {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (secret) {
    const stripe = new Stripe(secret, { apiVersion: "2024-06-20", timeout: 15000, maxNetworkRetries: 1 });
    for (const [name, priceId, recurring] of [
      ["oneoff", process.env.STRIPE_PRICE_ONEOFF, false],
      ["maker", process.env.STRIPE_PRICE_MAKER, true],
      ["commercial", process.env.STRIPE_PRICE_COMMERCIAL, true],
    ]) {
      if (!priceId) continue;
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) throw new Error(`Stripe price ${name} is inactive`);
      if (Boolean(price.recurring) !== recurring) throw new Error(`Stripe price ${name} has the wrong mode`);
    }
    ok("Stripe prices exist, are active, and match payment/subscription modes");

    const origin = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL);
    if (origin) {
      const wanted = `${origin}/api/checkout/webhook`;
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const endpoint = endpoints.data.find((item) => cleanUrl(item.url) === wanted);
      if (!endpoint) warn(`Stripe webhook endpoint not found for ${wanted}`);
      else if (endpoint.status !== "enabled") throw new Error(`Stripe webhook endpoint is ${endpoint.status}`);
      else ok("Stripe webhook endpoint is configured and enabled");
    }
  }
} catch (error) {
  fail(error?.message || String(error));
}

console.log("");
console.log(`Readiness: ${failures.length ? "blocked" : "ready"} (${failures.length} errors, ${warnings.length} warnings)`);
process.exitCode = failures.length ? 1 : 0;