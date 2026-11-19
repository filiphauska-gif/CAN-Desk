import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  const accounts = await prisma.emailAccount.findMany({ select: { id: true } });
  const results: Record<string, number> = {};
  const { syncAccount } = await import("@/server/actions/email");
  for (const a of accounts) {
    try {
      const r = await syncAccount(a.id);
      results[a.id] = r.added;
    } catch (e: any) {
      results[a.id] = -1;
    }
  }
  return Response.json({ ok: true, results });
}
