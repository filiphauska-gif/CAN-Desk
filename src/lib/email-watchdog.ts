/* Follow-up watchdog: turn silent email threads into tasks. */
import { prisma } from "@/lib/db";

const AUTOMATED =
  /no-?reply|noreply|neodpovidat|newsletter|notification|oznameni| automat|pool-id|faktur|idoklad|shipex|tracking|bounce|mailer-daemon/i;

const CLOSED_TASK = ["HOTOVO", "UZAVRENO"];

export async function generateFollowupTasks() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) return { created: 0 };

  const since = new Date(Date.now() - 90 * 86_400_000);
  const emails = await prisma.email.findMany({
    where: { receivedAt: { gte: since } },
    orderBy: { receivedAt: "asc" },
    select: {
      threadId: true,
      direction: true,
      fromAddress: true,
      fromName: true,
      subject: true,
      receivedAt: true,
      projectId: true,
    },
  });

  const threads = new Map<string, typeof emails>();
  for (const e of emails) {
    const key = e.threadId || e.subject || "?";
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key)!.push(e);
  }

  const existing = await prisma.task.findMany({
    where: { description: { contains: "[[auto:" } },
    select: { description: true, status: true },
  });
  const openMarkers = new Set(
    existing.filter((t) => !CLOSED_TASK.includes(t.status)).map((t) => (t.description || "").match(/\[\[auto:([^\]]+)\]\]/)?.[1])
  );

  let created = 0;
  const now = Date.now();

  for (const [key, msgs] of Array.from(threads.entries())) {
    const last = msgs[msgs.length - 1];
    const days = Math.floor((now - new Date(last.receivedAt).getTime()) / 86_400_000);
    if (AUTOMATED.test(last.fromAddress) || AUTOMATED.test(last.fromName || "")) continue;

    const marker = `${key}`.slice(0, 120);
    if (openMarkers.has(marker)) continue;

    // client wrote last, we never replied
    if (last.direction === "IN" && days >= 2) {
      await prisma.task.create({
        data: {
          title: `Odpovědět: ${last.fromName || last.fromAddress} - ${(last.subject || "").slice(0, 60)}`,
          description: `Automaticky z pošty: klient čeká na odpověď ${days} dní.\n[[auto:${marker}]]`,
          status: "OTEVRENO",
          priority: days >= 5 ? 2 : 1,
          deadline: new Date(),
          projectId: last.projectId,
          assignments: { create: [{ userId: admin.id }] },
        },
      });
      created++;
      continue;
    }

    // we wrote last, client stays silent
    const hadInbound = msgs.some((m) => m.direction === "IN");
    if (last.direction === "OUT" && hadInbound && days >= 4) {
      await prisma.task.create({
        data: {
          title: `Připomenout: ${(last.subject || "").slice(0, 60)}`,
          description: `Automaticky z pošty: klient se neozval ${days} dní.\n[[auto:${marker}]]`,
          status: "OTEVRENO",
          priority: 0,
          deadline: new Date(),
          projectId: last.projectId,
          assignments: { create: [{ userId: admin.id }] },
        },
      });
      created++;
    }
  }

  return { created };
}
