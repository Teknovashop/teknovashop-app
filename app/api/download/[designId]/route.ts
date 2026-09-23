import { buildZip } from "@/lib/server/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { designId: string } }
) {
  const zip = buildZip([
    {
      name: "README.txt",
      data: Buffer.from("Design " + params.designId, "utf8"),
    },
  ]);

  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-length": String(zip.length),
    },
  });
}
