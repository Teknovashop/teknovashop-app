import { notFound } from "next/navigation";
import ForgeV2Workspace from "@/components/forge-v2/ForgeV2Workspace";
import { FORGE_FLAGS } from "@/lib/forge-v2/flags";
import { getCanonicalProduct } from "@/lib/server-canonical-catalog";

export const dynamic = "force-dynamic";

export default async function ForgeV2LabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCanonicalProduct(slug);
  if (!product) notFound();

  return (
    <ForgeV2Workspace
      slug={product.slug}
      premiumSurface={FORGE_FLAGS.experimentalSurfaces}
    />
  );
}
