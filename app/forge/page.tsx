import { redirect } from "next/navigation";
import { canonicalModelSlug } from "@/lib/model-routing";

export const dynamic = "force-dynamic";

export default async function ForgePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = (await searchParams) || {};
  const requested = canonicalModelSlug(typeof query.model === "string" ? query.model : "");
  if (requested) {
    const next = new URLSearchParams();
    if (typeof query.params === "string") next.set("params", query.params);
    redirect(`/forge/${encodeURIComponent(requested)}${next.size ? `?${next}` : ""}`);
  }
  redirect("/catalog");
}
