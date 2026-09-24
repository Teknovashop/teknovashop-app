import { notFound, redirect } from "next/navigation";
import ForgeWorkspace from "@/components/ForgeWorkspace";
import { MODELS } from "@/data/models";
import { canonicalModelSlug } from "@/lib/model-routing";

export const dynamic = "force-dynamic";

export default function ProductPage({ params, searchParams }: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const slug = canonicalModelSlug(params.slug);
  if (!MODELS.some((model) => model.slug === slug)) notFound();
  if (slug !== params.slug) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams || {})) {
      if (typeof value === "string") query.set(key, value);
      else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    }
    redirect(`/forge/${slug}${query.size ? `?${query}` : ""}`);
  }
  const initial = typeof searchParams?.params === "string" ? searchParams.params : undefined;
  return <ForgeWorkspace key={`${slug}:${initial || ""}`} model={slug} params={initial} />;
}
