import { notFound, redirect } from "next/navigation";
import ForgeV2Workspace from "@/components/forge-v2/ForgeV2Workspace";
import { canonicalModelSlug } from "@/lib/model-routing";
import { getCanonicalProduct } from "@/lib/server-canonical-catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  const slug = canonicalModelSlug(resolved.slug);
  if (slug !== resolved.slug) redirect(`/forge/${encodeURIComponent(slug)}`);

  const product = await getCanonicalProduct(slug);
  if (!product || !product.public || product.stage !== "production") notFound();

  return <ForgeV2Workspace slug={product.slug} premiumSurface />;
}
