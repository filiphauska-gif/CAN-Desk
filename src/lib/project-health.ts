export type HealthLevel = "ok" | "warn" | "risk";

export type ProjectHealth = {
  level: HealthLevel;
  label: string;
  detail: string;
};

const escalate = (current: HealthLevel, next: HealthLevel): HealthLevel =>
  next === "risk" ? "risk" : current === "ok" ? next : current;

/**
 * Simple project health: overdue tasks, hours burn, deadline proximity.
 * Used in the projects list and the project detail header.
 */
export function projectHealth(input: {
  status: string;
  deadline: Date | null;
  overdueTasks: number;
  workedHours: number;
  plannedHours: number;
}): ProjectHealth {
  if (["DOKONCENO", "FAKTUROVANO", "ARCHIVOVANO"].includes(input.status)) {
    return { level: "ok", label: "Uzavřeno", detail: "" };
  }

  const reasons: string[] = [];
  let level: HealthLevel = "ok";

  if (input.overdueTasks >= 2) {
    level = escalate(level, "risk");
    reasons.push(`${input.overdueTasks} úkoly po termínu`);
  } else if (input.overdueTasks === 1) {
    level = escalate(level, "warn");
    reasons.push("1 úkol po termínu");
  }

  if (input.plannedHours > 0) {
    const burn = input.workedHours / input.plannedHours;
    if (burn > 1) {
      level = escalate(level, "risk");
      reasons.push("vyčerpané plánované hodiny");
    } else if (burn > 0.8) {
      level = escalate(level, "warn");
      reasons.push("hodiny nad 80 %");
    }
  }

  if (input.deadline) {
    const daysLeft = Math.ceil((input.deadline.getTime() - Date.now()) / 86_400_000);
    if (daysLeft < 0) {
      level = escalate(level, "risk");
      reasons.push("po deadline");
    } else if (daysLeft <= 7) {
      level = escalate(level, "warn");
      reasons.push("deadline do 7 dnů");
    }
  }

  const label = level === "risk" ? "Riziko" : level === "warn" ? "Pozor" : "V pořádku";
  return { level, label, detail: reasons.join(", ") };
}

export const healthStyles: Record<HealthLevel, { dot: string; text: string }> = {
  ok: { dot: "bg-emerald-400", text: "text-emerald-600" },
  warn: { dot: "bg-amber-400", text: "text-amber-600" },
  risk: { dot: "bg-rose-500", text: "text-rose-600" },
};
