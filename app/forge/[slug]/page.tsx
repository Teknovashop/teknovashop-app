import { notFound, redirect } from "next/navigation";
import ForgeV2Workspace from "@/components/forge-v2/ForgeV2Workspace";
import { canonicalModelSlug } from "@/lib/model-routing";
import { getCanonicalProduct } from "@/lib/server-canonical-catalog";

export const dynamic = "force-dynamic";

type InitialParams = Record<string, number | string | boolean>;

function parseInitialParams(value: unknown): InitialParams | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, item]) =>
        typeof item === "number" || typeof item === "string" || typeof item === "boolean"
      )
    ) as InitialParams;
  } catch {
    return undefined;
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await params;
  const query = (await searchParams) || {};
  const slug = canonicalModelSlug(resolved.slug);
  if (slug !== resolved.slug) {
    const next = new URLSearchParams();
    if (typeof query.params === "string") next.set("params", query.params);
    redirect(`/forge/${encodeURIComponent(slug)}${next.size ? `?${next}` : ""}`);
  }

  const product = await getCanonicalProduct(slug);
  if (!product || !product.public || product.stage !== "production") notFound();

  return (
    <ForgeV2Workspace
      slug={product.slug}
      premiumSurface
      initialParams={parseInitialParams(query.params)}
    />
  );
}
