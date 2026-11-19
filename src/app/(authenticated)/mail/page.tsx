import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MailClient } from "./mail-client";

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const params = await searchParams;

  const account = await prisma.emailAccount.findUnique({ where: { userId: user.id } });

  const [emails, projects] = await Promise.all([
    prisma.email.findMany({
      where: account ? { accountId: account.id } : { id: "__none__" },
      include: { project: { select: { id: true, jobNumber: true, name: true } } },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.project.findMany({
      where: { status: { notIn: ["UZAVRENO", "ZRUSENO"] } },
      select: { id: true, jobNumber: true, name: true },
      orderBy: { jobNumber: "desc" },
    }),
  ]);

  return (
    <MailClient
      account={account ? { email: account.email, lastSyncAt: account.lastSyncAt?.toISOString() || null } : null}
      initialEmails={emails.map((e) => ({
        id: e.id,
        direction: e.direction,
        fromAddress: e.fromAddress,
        fromName: e.fromName,
        subject: e.subject,
        snippet: e.snippet,
        bodyText: e.bodyText,
        receivedAt: e.receivedAt.toISOString(),
        unread: e.unread,
        projectId: e.projectId,
        projectLabel: e.project ? `${e.project.jobNumber || ""} ${e.project.name}`.trim() : null,
        matchReason: e.matchReason,
        matchConfidence: e.matchConfidence,
      }))}
      projects={projects}
      error={params.error || null}
      connected={params.connected === "1"}
    />
  );
}
