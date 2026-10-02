import { notFound } from "next/navigation";
import ForgeV2Workspace from "@/components/forge-v2/ForgeV2Workspace";
import { isForgeV2Product } from "@/lib/forge-v2/capabilities";
import { FORGE_FLAGS } from "@/lib/forge-v2/flags";

export const dynamic = "force-dynamic";

export default async function ForgeV2LabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isForgeV2Product(slug)) notFound();

  return <ForgeV2Workspace slug={slug} premiumSurface={FORGE_FLAGS.experimentalSurfaces} />;
}
