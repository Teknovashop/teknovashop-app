import { redirect } from "next/navigation";

export default async function LegacyForgeV2Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/forge/${encodeURIComponent(slug)}`);
}
