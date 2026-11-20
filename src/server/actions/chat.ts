"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  await prisma.chatMessage.create({
    data: { roomId, authorId: user.id, body: text.slice(0, 4000) },
  });
  revalidatePath("/");
  return { ok: true };
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
