import CheckoutSuccess from "@/components/CheckoutSuccess";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionId =
    typeof params.session_id === "string" ? params.session_id : undefined;
  const designId =
    typeof params.design_id === "string" ? params.design_id : undefined;

  return <CheckoutSuccess sessionId={sessionId} urlDesignId={designId} />;
}
