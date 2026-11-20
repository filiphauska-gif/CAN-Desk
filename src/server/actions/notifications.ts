"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function me() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as any;
}

export async function getMyNotifications() {
  const user = await me();
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function markAllNotificationsRead() {
  const user = await me();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function markNotificationRead(id: string) {
  const user = await me();
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

/** Create comment notifications for project owner + admins (excluding the author). */
export async function notifyProjectComment(projectId: string, authorId: string, snippet: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, accountId: true },
  });
  if (!project) return;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true },
  });

  const recipients = new Set<string>();
  if (project.accountId) recipients.add(project.accountId);
  admins.forEach((a) => recipients.add(a.id));
  recipients.delete(authorId);

  if (recipients.size === 0) {
    const all = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
    all.forEach((u) => recipients.add(u.id));
    recipients.delete(authorId);
  }
  if (recipients.size === 0) return;

  await prisma.notification.createMany({
    data: Array.from(recipients).map((userId) => ({
      userId,
      type: "COMMENT",
      title: `Nový komentář: ${project.name}`,
      body: snippet.slice(0, 140),
      link: `/projects/${project.id}?tab=komentare`,
      projectId: project.id,
    })),
  });
}
