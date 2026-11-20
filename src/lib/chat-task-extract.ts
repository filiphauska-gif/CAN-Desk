/* Extract a task from a chat message (CZE): deadline + action + project. */
import { prisma } from "@/lib/db";

const GREETING = /^(ahoj|čau|zdar|dobrý den|dobré ráno|hezký den|prosím|prosim)[,!.\s]+/i;
const FILLER = /\b(prosím|prosim|díky|děkuji|dekuji)\b/gi;

export type ExtractedTask = {
  title: string;
  deadline: Date;
  projectId: string | null;
  projectLabel: string | null;
};

function parseDeadline(text: string): Date | null {
  const now = new Date();
  const t = text.toLowerCase();

  // explicit date: "27. 11.", "27.11.2026", "27. listopadu"
  const m = t.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})?/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = m[3] ? Number(m[3]) : now.getFullYear();
    const d = new Date(Date.UTC(year, month, day, 15, 0));
    if (d.getTime() < now.getTime() - 86_400_000) d.setUTCFullYear(year + 1);
    return d;
  }

  const months: Record<string, number> = {
    ledna: 0, února: 1, unora: 1, března: 2, brezna: 2, dubna: 3, května: 4, května2: 4,
    června: 5, cervna: 5, července: 6, cervence: 6, srpna: 7, září: 8, zari: 8,
    října: 9, rijna: 9, listopadu: 10, prosince: 11,
  };
  const dm = t.match(/\b(\d{1,2})\.\s*(ledna|února|unora|března|brezna|dubna|května|června|cervna|července|cervence|srpna|září|zari|října|rijna|listopadu|prosince)/);
  if (dm) {
    const d = new Date(Date.UTC(now.getFullYear(), months[dm[2]] ?? 0, Number(dm[1]), 15, 0));
    if (d.getTime() < now.getTime() - 86_400_000) d.setUTCFullYear(now.getFullYear() + 1);
    return d;
  }

  if (/\bzítra\b|\bzitra\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(15, 0, 0, 0);
    return d;
  }

  const weekdays: [RegExp, number][] = [
    [/pondělí|pondeli/, 1], [/úterý|utery/, 2], [/středu|stredu/, 3],
    [/čtvrtek|ctvrtek/, 4], [/pátek|patek/, 5],
  ];
  for (const [re, day] of weekdays) {
    if (re.test(t)) {
      const d = new Date(now);
      const diff = (day - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(15, 0, 0, 0);
      return d;
    }
  }
  if (/do konce týdne|do konce tydne/.test(t)) {
    const d = new Date(now);
    const diff = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(15, 0, 0, 0);
    return d;
  }
  return null;
}

async function findProject(text: string) {
  const job = text.match(/job[-\s]?0*(\d{4,5})/i);
  if (job) {
    const p = await prisma.project.findFirst({
      where: { jobNumber: `JOB-${job[1].padStart(5, "0")}` },
      select: { id: true, jobNumber: true, name: true },
    });
    if (p) return p;
  }
  const projects = await prisma.project.findMany({
    where: { status: { notIn: ["UZAVRENO", "ZRUSENO"] } },
    select: { id: true, jobNumber: true, name: true },
  });
  const lower = text.toLowerCase();
  let best: { id: string; jobNumber: string | null; name: string; score: number } | null = null;
  for (const p of projects) {
    const words = (p.name.toLowerCase().match(/[a-z0-9á-ž]{4,}/g) || []).filter(
      (w) => !["2026", "pro", "praha", "kampan"].includes(w)
    );
    const score = words.filter((w) => lower.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { ...p, score };
  }
  return best;
}

export async function extractChatTask(text: string): Promise<ExtractedTask | null> {
  if (text.length < 12) return null;
  const deadline = parseDeadline(text);
  const hasAction = /\b(udělat|udelat|připravit|pripravit|poslat|dodat|zařídit|zaridit|vytvořit|vytvorit|napsat|zpracovat|odevzdat|máme|mame)\b/i.test(text);
  if (!deadline || !hasAction) return null;

  const project = await findProject(text);
  let title = text
    .replace(GREETING, "")
    .replace(/^[A-ZÁ-Ž][a-zá-ž]{2,},\s*/, "")
    .replace(/^(já\s+|ja\s+)?musím\s+/i, "")
    .replace(FILLER, "")
    .replace(/^do\s+[^,]{0,25}?\d{1,2}\.\s*\d{1,2}\.?\s*(\d{4})?\s*[:,]?\s*/i, "")
    .replace(/máme\s+(udělat|udelat|připravit|pripravit)/i, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length > 120) title = title.slice(0, 117) + "...";
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title,
    deadline,
    projectId: project?.id ?? null,
    projectLabel: project ? `${project.jobNumber || ""} ${project.name}`.trim() : null,
  };
}
