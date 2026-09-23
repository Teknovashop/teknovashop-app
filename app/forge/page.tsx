import type { Metadata } from "next";
import ForgeWorkspace from "@/components/ForgeWorkspace";
import { MODELS } from "@/data/models";
import { canonicalModelSlug } from "@/lib/model-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Configurador 3D",
  alternates: { canonical: "/forge" },
};

export default function ForgePage({ searchParams }: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const requested = canonicalModelSlug(typeof searchParams?.model === "string" ? searchParams.model : "");
  const model = MODELS.find((item) => item.slug === requested)?.slug || "vesa-adapter";
  const params = typeof searchParams?.params === "string" ? searchParams.params : undefined;
  return <ForgeWorkspace key={`${model}:${params || ""}`} model={model} params={params} />;
}
