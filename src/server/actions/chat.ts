"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { extractChatTask } from "@/lib/chat-task-extract";

async function me() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as any;
}

async function requireMember(roomId: string, userId: string) {
  const m = await prisma.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!m) throw new Error("Nejste členem této konverzace");
  return m;
}

export async function listChatPeople() {
  const user = await me();
  return prisma.user.findMany({
    where: { active: true, id: { not: user.id } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function openDM(otherId: string) {
  const user = await me();
  const key = `dm:${[user.id, otherId].sort().join(":")}`;
  let room = await prisma.chatRoom.findFirst({
    where: { name: key, kind: "DM" },
    select: { id: true },
  });
  if (!room) {
    room = await prisma.chatRoom.create({
      data: {
        name: key,
        kind: "DM",
        members: { create: [{ userId: user.id }, { userId: otherId }] },
      },
      select: { id: true },
    });
  }
  return room;
}

export async function getChatMessages(roomId: string) {
  const user = await me();
  await requireMember(roomId, user.id);
  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: { id: true, name: true } } },
  });
  await prisma.chatMember.update({
    where: { roomId_userId: { roomId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
  return messages.map((m) => ({
    id: m.id,
    kind: m.kind,
    body: m.body,
    authorId: m.authorId,
    authorName: m.author.name,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function sendChatMessage(roomId: string, body: string) {
  const user = await me();
  await requireMember(roomId, user.id);
  const text = body.trim();
  if (!text) throw new Error("Prázdná zpráva");
  const msg = await prisma.chatMessage.create({
    data: { roomId, authorId: user.id, body: text.slice(0, 4000) },
  });

  // automatic task extraction from message text
  let createdTask: { title: string; deadline: string; assignees: string[] } | null = null;
  try {
    const extracted = await extractChatTask(text);
    if (extracted) {
      const members = await prisma.chatMember.findMany({
        where: { roomId },
        include: { user: { select: { id: true, name: true } } },
      });
      const others = members.filter((m) => m.userId !== user.id).map((m) => m.user);
      const sender = members.find((m) => m.userId === user.id)?.user ?? { id: user.id, name: user.name || "Já" };
      const lower = text.toLowerCase();
      let targets = others;

      const mentioned = others.filter((t) =>
        lower.includes(t.name.split(" ")[0].toLowerCase())
      );
      const selfIntent =
        /(já|ja)\s+(musím|musim|udělám|udelam|zařídím|zaridim|pošlu|poslu|připravím|pripravim|vytvořím|vytvorim|dodám|dodam|odevzdám|odevzdam)/.test(lower) ||
        /musím|musim/.test(lower);
      const weIntent = /máme|mame/.test(lower);
      const otherIntent = /(udělej|udelej|pošli|posli|připrav|priprav|zařiď|zarid|vytvoř|vytvor|dodej|pošlete|poslete|udělejte|udelejte)/.test(lower);

      if (mentioned.length > 0) targets = mentioned;
      else if (weIntent) targets = [sender, ...others];
      else if (selfIntent) targets = [sender];
      else if (otherIntent) targets = others;
      if (targets.length > 0) {
        await prisma.task.create({
          data: {
            title: extracted.title,
            description: `Vytvořeno z chatu.
[[chat:${msg.id}]]`,
            status: "OTEVRENO",
            priority: 0,
            deadline: extracted.deadline,
            projectId: extracted.projectId,
            assignments: { create: targets.map((t) => ({ userId: t.id })) },
          },
        });
        const names = targets.map((t) => t.name).join(", ");
        const dateLabel = extracted.deadline.toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "numeric",
        });
        await prisma.chatMessage.create({
          data: {
            roomId,
            authorId: user.id,
            kind: "SYSTEM",
            body: `Úkol vytvořen: ${extracted.title} (do ${dateLabel})${
              extracted.projectLabel ? ` | ${extracted.projectLabel}` : ""
            } | pro: ${names}`,
          },
        });
        createdTask = { title: extracted.title, deadline: extracted.deadline.toISOString(), assignees: names.split(", ") };
      }
    }
  } catch {
    // never block messaging because of extraction
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true, createdTask };
}

export async function chatUnreadCount() {
  const user = await me();
  const memberships = await prisma.chatMember.findMany({
    where: { userId: user.id },
    select: { roomId: true, lastReadAt: true },
  });
  let total = 0;
  for (const m of memberships) {
    total += await prisma.chatMessage.count({
      where: {
        roomId: m.roomId,
        authorId: { not: user.id },
        createdAt: { gt: m.lastReadAt },
      },
    });
  }
  return total;
}
