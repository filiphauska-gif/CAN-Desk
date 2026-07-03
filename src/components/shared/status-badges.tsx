import { Badge } from "@/components/ui/badge";

const projectStatusStyles: Record<string, string> = {
  NOVY: "bg-blue-50 text-blue-700 border-blue-200",
  V_PRIPRAVE: "bg-amber-50 text-amber-700 border-amber-200",
  CEKA_NA_KLIENTA: "bg-purple-50 text-purple-700 border-purple-200",
  BEZI: "bg-emerald-50 text-emerald-700 border-emerald-200",
  V_INTERNI_KONTROLE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  V_KLIENTSKE_KONTROLE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DOKONCENO: "bg-green-50 text-green-700 border-green-200",
  FAKTUROVANO: "bg-slate-50 text-slate-700 border-slate-200",
  ARCHIVOVANO: "bg-gray-50 text-gray-500 border-gray-200",
};

const projectStatusLabels: Record<string, string> = {
  NOVY: "Nový",
  V_PRIPRAVE: "V přípravě",
  CEKA_NA_KLIENTA: "Čeká na klienta",
  BEZI: "Běží",
  V_INTERNI_KONTROLE: "Interní kontrola",
  V_KLIENTSKE_KONTROLE: "Klientská kontrola",
  DOKONCENO: "Dokončeno",
  FAKTUROVANO: "Fakturováno",
  ARCHIVOVANO: "Archivováno",
};

const taskStatusStyles: Record<string, string> = {
  BACKLOG: "bg-gray-50 text-gray-500 border-gray-200",
  TODO: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING: "bg-purple-50 text-purple-700 border-purple-200",
  REVIEW: "bg-cyan-50 text-cyan-700 border-cyan-200",
  DONE: "bg-green-50 text-green-700 border-green-200",
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
      className={`font-normal text-xs ${projectStatusStyles[status] || ""}`}
    >
      {projectStatusLabels[status] || status}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-normal text-xs ${taskStatusStyles[status] || ""}`}
    >
      {taskStatusLabels[status] || status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 2) return <Badge className="bg-red-100 text-red-700 border-red-200 font-normal text-xs">Urgentní</Badge>;
  if (priority >= 1) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-normal text-xs">Vysoká</Badge>;
  return null;
}

export { projectStatusLabels, taskStatusLabels };
