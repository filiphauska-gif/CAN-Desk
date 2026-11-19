"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMessage, listMessageIds, sendMail } from "@/lib/gmail";
import { resolveEmailTarget } from "@/lib/email-match";

async function currentUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as any;
}

/** Pull new messages for one connected mailbox. */
export async function syncAccount(accountId: string, initialDays = 30) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return { added: 0 };

  const query = account.lastSyncAt
    ? `after:${Math.floor(new Date(account.lastSyncAt).getTime() / 1000)} -in:chats`
    : `newer_than:${initialDays}d -in:chats`;

  const ids = await listMessageIds(account, query, 60);
  let added = 0;

  for (const { id } of ids) {
    const exists = await prisma.email.findUnique({ where: { gmailId: id } });
    if (exists) continue;
    try {
      const msg = await getMessage(account, id);
      const target = await resolveEmailTarget(msg.fromAddress, msg.subject || "", msg.bodyText);
      await prisma.email.create({
        data: {
          accountId: account.id,
          gmailId: msg.gmailId,
          threadId: msg.threadId,
          direction: "IN",
          fromAddress: msg.fromAddress,
          fromName: msg.fromName,
          toAddress: msg.toAddress,
          subject: msg.subject,
          snippet: msg.snippet,
          bodyText: msg.bodyText,
          receivedAt: msg.receivedAt,
          unread: msg.unread,
          projectId: target.projectId,
          clientId: target.clientId,
          matchConfidence: target.confidence,
          matchReason: target.reason,
        },
      });
      added++;
    } catch {
      // skip unreadable message
    }
  }

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });
  return { added };
}

export async function syncMyMailbox() {
  const user = await currentUser();
  const account = await prisma.emailAccount.findUnique({ where: { userId: user.id } });
  if (!account) throw new Error("Schránka není připojená");
  const res = await syncAccount(account.id);
  revalidatePath("/mail");
  return res;
}

export async function assignEmail(emailId: string, projectId: string | null) {
  await currentUser();
  const project = projectId
    ? await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } })
    : null;
  const email = await prisma.email.update({
    where: { id: emailId },
    data: {
      projectId,
      clientId: project?.clientId ?? null,
      matchReason: projectId ? "ruční přiřazení" : null,
      matchConfidence: projectId ? 1 : 0,
    },
  });
  revalidatePath("/mail");
  return email;
}

export async function replyToEmail(emailId: string, body: string) {
  const user = await currentUser();
  const account = await prisma.emailAccount.findUnique({ where: { userId: user.id } });
  if (!account) throw new Error("Schránka není připojená");

  const original = await prisma.email.findUnique({ where: { id: emailId } });
  if (!original) throw new Error("E-mail nenalezen");

  const subject = (original.subject || "").startsWith("Re:")
    ? original.subject!
    : `Re: ${original.subject || ""}`;

  await sendMail(account, {
    to: original.fromAddress,
    subject,
    body,
    threadId: original.threadId,
  });

  await prisma.email.create({
    data: {
      accountId: account.id,
      gmailId: `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId: original.threadId,
      direction: "OUT",
      fromAddress: account.email,
      toAddress: original.fromAddress,
      subject,
      snippet: body.slice(0, 200),
      bodyText: body,
      receivedAt: new Date(),
      unread: false,
      projectId: original.projectId,
      clientId: original.clientId,
      matchConfidence: 1,
      matchReason: "odpověď",
    },
  });

  revalidatePath("/mail");
  return { ok: true };
}

export async function markEmailRead(emailId: string) {
  await currentUser();
  await prisma.email.update({ where: { id: emailId }, data: { unread: false } });
}

export async function disconnectMailbox() {
  const user = await currentUser();
  await prisma.emailAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath("/mail");
}
