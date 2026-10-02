import { notFound } from "next/navigation";
import ForgeV2Workspace from "@/components/forge-v2/ForgeV2Workspace";
import { FORGE_FLAGS } from "@/lib/forge-v2/flags";
import { FORGE_V2_PILOTS } from "@/lib/forge-v2/capabilities";

export const dynamic = "force-dynamic";

export default async function ForgeV2LabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!FORGE_FLAGS.v2Ui) notFound();

  const { slug } = await params;
  if (!FORGE_V2_PILOTS[slug]) notFound();

  return <ForgeV2Workspace slug={slug} />;
}
