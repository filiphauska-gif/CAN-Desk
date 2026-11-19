/* Match incoming emails to projects: JOB number > sender -> client > keywords. */
import { prisma } from "@/lib/db";

export type EmailTarget = {
  projectId: string | null;
  clientId: string | null;
  confidence: number;
  reason: string;
};

const ACTIVE: any = { notIn: ["UZAVRENO", "ZRUSENO"] };

export async function resolveEmailTarget(
  fromAddress: string,
  subject: string,
  body: string
): Promise<EmailTarget> {
  const text = `${subject}\n${body}`.toLowerCase();

  // 1) JOB number anywhere in subject/body
  const job = text.match(/job[-\s]?0*(\d{4,5})/i);
  if (job) {
    const normalized = `JOB-${job[1].padStart(5, "0")}`;
    const project = await prisma.project.findFirst({
      where: { jobNumber: normalized },
      select: { id: true, clientId: true },
    });
    if (project) {
      return {
        projectId: project.id,
        clientId: project.clientId,
        confidence: 1,
        reason: `číslo zakázky ${normalized}`,
      };
    }
  }

  // 2) sender is a known client contact
  const client = await prisma.client.findFirst({
    where: { email: fromAddress },
    select: { id: true, name: true },
  });

  if (client) {
    const projects = await prisma.project.findMany({
      where: { clientId: client.id, status: ACTIVE },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    });
    if (projects.length === 1) {
      return {
        projectId: projects[0].id,
        clientId: client.id,
        confidence: 0.9,
        reason: `odesílatel je kontakt klienta ${client.name} (1 aktivní zakázka)`,
      };
    }
    if (projects.length > 1) {
      const best = scoreProjects(text, projects);
      if (best && best.score > 0) {
        return {
          projectId: best.id,
          clientId: client.id,
          confidence: Math.min(0.8, 0.5 + best.score * 0.1),
          reason: `klíčová slova (${best.hits.join(", ")})`,
        };
      }
      return { projectId: null, clientId: client.id, confidence: 0.4, reason: `klient ${client.name}, více zakázek` };
    }
    return { projectId: null, clientId: client.id, confidence: 0.3, reason: `klient ${client.name}, žádná aktivní zakázka` };
  }

  // 3) unknown sender: try project name keywords across active projects
  const all = await prisma.project.findMany({
    where: { status: ACTIVE },
    select: { id: true, name: true, clientId: true },
  });
  const best = scoreProjects(text, all);
  if (best && best.score >= 2) {
    return {
      projectId: best.id,
      clientId: best.clientId,
      confidence: 0.5,
      reason: `shoda názvu zakázky (${best.hits.join(", ")})`,
    };
  }

  return { projectId: null, clientId: null, confidence: 0, reason: "nepodařilo se přiřadit" };
}

const STOP = new Set(["prace", "praha", "pro", "projekt", "kampan", "zakazka", "spol", "sro"]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9ěščřžýáíéúůťďň]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

function scoreProjects(text: string, projects: { id: string; name: string; clientId?: string | null }[]) {
  let best: { id: string; clientId?: string | null; score: number; hits: string[] } | null = null;
  for (const p of projects) {
    const hits = tokenize(p.name).filter((w) => text.includes(w));
    const score = hits.length;
    if (!best || score > best.score) best = { ...p, score, hits: Array.from(new Set(hits)).slice(0, 3) };
  }
  return best && best.score > 0 ? best : null;
}
