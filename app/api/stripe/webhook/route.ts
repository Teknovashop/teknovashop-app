// Keep existing Stripe dashboard URLs working through the same verified handler.
export { POST } from "@/app/api/checkout/webhook/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";