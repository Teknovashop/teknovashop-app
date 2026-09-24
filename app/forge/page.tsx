import type { Metadata } from "next";
import ForgeWorkspace from "@/components/ForgeWorkspace";
import { MODELS } from "@/data/models";
import { canonicalModelSlug } from "@/lib/model-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Configurador 3D",
  alternates: { canonical: "/forge" },
};

export default async function ForgePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const requested = canonicalModelSlug(typeof resolvedSearchParams.model === "string" ? resolvedSearchParams.model : "");
  const model = MODELS.find((item) => item.slug === requested)?.slug || "vesa-adapter";
  const params = typeof resolvedSearchParams.params === "string" ? resolvedSearchParams.params : undefined;
  return <ForgeWorkspace key={`${model}:${params || ""}`} model={model} params={params} />;
}
