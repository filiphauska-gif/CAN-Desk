import { Badge } from "@/components/ui/badge";

/*
 * Harmonized status palette — soft glass tints that sit well on the
 * liquid-glass aurora background. One consistent hue family per meaning:
 *   sky=nové, amber=příprava/čekání, violet=čeká na klienta,
 *   emerald=běží, indigo=interní práce, teal=hotovo, stone=neutrální
 */
const projectStatusStyles: Record<string, string> = {
  CEKA: "badge-amber",
  OTEVRENO: "badge-emerald",
  HOTOVO: "badge-teal",
  UZAVRENO: "badge-indigo",
  ZRUSENO: "badge-stone opacity-70",
};

const projectStatusLabels: Record<string, string> = {
  CEKA: "Čeká",
  OTEVRENO: "Otevřeno",
  HOTOVO: "Hotovo",
  UZAVRENO: "Uzavřeno",
  ZRUSENO: "Zrušeno",
};

const taskStatusStyles: Record<string, string> = {
  BACKLOG: "badge-stone",
  TODO: "badge-sky",
  IN_PROGRESS: "badge-indigo",
  WAITING: "badge-amber",
  REVIEW: "badge-violet",
  DONE: "badge-teal",
};

const taskStatusLabels: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting",
  REVIEW: "Review",
  DONE: "Done",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-medium text-xs border ${projectStatusStyles[status] || "badge-stone"}`}
    >
      {projectStatusLabels[status] || status}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-medium text-xs border ${taskStatusStyles[status] || "badge-stone"}`}
    >
      {taskStatusLabels[status] || status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 2)
    return <Badge className="badge-rose border font-medium text-xs">Urgentní</Badge>;
  if (priority >= 1)
    return <Badge className="badge-amber border font-medium text-xs">Vysoká</Badge>;
  return null;
}

export { projectStatusLabels, taskStatusLabels };
