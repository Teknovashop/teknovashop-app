import { notFound, redirect } from "next/navigation";
import ForgeWorkspace from "@/components/ForgeWorkspace";
import { MODELS } from "@/data/models";
import { canonicalModelSlug } from "@/lib/model-routing";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const slug = canonicalModelSlug(resolvedParams.slug);
  if (!MODELS.some((model) => model.slug === slug)) notFound();
  if (slug !== resolvedParams.slug) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") query.set(key, value);
      else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    }
    redirect(`/forge/${slug}${query.size ? `?${query}` : ""}`);
  }
  const initial = typeof resolvedSearchParams.params === "string" ? resolvedSearchParams.params : undefined;
  return <ForgeWorkspace key={`${slug}:${initial || ""}`} model={slug} params={initial} />;
}
