export const TERMS_VERSION = "2026-09-23.1";
export const LICENSE_VERSION = "1.0";

export type CommercePlan = "oneoff" | "maker" | "commercial";

export function licenseLabel(plan: CommercePlan) {
  if (plan === "commercial") return "Commercial";
  if (plan === "maker") return "Maker";
  return "Single Design";
}
