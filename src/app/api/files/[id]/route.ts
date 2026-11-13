import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(att.data), {
    headers: {
      "Content-Type": att.mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(att.name)}`,
      "Content-Length": String(att.size),
    },
  });
}
