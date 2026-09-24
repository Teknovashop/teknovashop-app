export function safeReturnPath(value: string | null | undefined, fallback = "/forge") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://local.invalid");
    return parsed.origin === "https://local.invalid" ? parsed.pathname + parsed.search + parsed.hash : fallback;
  } catch {
    return fallback;
  }
}

export function isCurrentEntitlement(row: any, now = Date.now()): boolean {
  if (!row?.active) return false;
  const start = row.starts_at ? Date.parse(row.starts_at) : 0;
  const end = row.expires_at ? Date.parse(row.expires_at) : Infinity;
  return Number.isFinite(start) && start <= now && end > now;
}

export function selectEntitlement(rows: any[], designId?: string, now = Date.now()) {
  const current = rows.filter((row) => isCurrentEntitlement(row, now));
  return current.find((row) => row.kind === "subscription" && row.plan === "commercial")
    || current.find((row) => row.kind === "subscription" && row.plan === "maker")
    || (designId ? current.find((row) => row.kind === "design" && row.plan === "oneoff" && row.design_id === designId) : undefined);
}

export function isCommercePlan(value: unknown): value is "oneoff" | "maker" | "commercial" {
  return value === "oneoff" || value === "maker" || value === "commercial";
}

export function checkoutIsPaid(session: { status?: string | null; payment_status?: string | null }) {
  return session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
}