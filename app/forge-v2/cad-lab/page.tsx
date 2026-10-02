import type { Metadata } from "next";
import CadLabWorkspace from "@/components/forge-v2/CadLabWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CAD Engine Lab | Teknovashop Forge",
  robots: { index: false, follow: false },
};

export default function CadLabPage() {
  return <CadLabWorkspace />;
}
