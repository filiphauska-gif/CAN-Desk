"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Wallet, Receipt, Clock, MessageSquare, CheckSquare, FileText, Package, Paperclip } from "lucide-react";
import { ProjectTasksTab } from "./tabs/project-tasks-tab";
import { ProjectTimeTab } from "./tabs/project-time-tab";
import { ProjectBudgetNewTab } from "./tabs/budget/index";
import { ProjectFinanceTab } from "./tabs/project-finance-tab";
import { ProjectCommentsTab } from "./tabs/project-comments-tab";
import { BudgetBarsCard } from "@/components/shared/budget-bars";
import { ProjectInvoicesTab, ProjectOrdersTab } from "./tabs/project-documents-tabs";
import { ProjectFilesTab } from "./tabs/project-files-tab";

const tabs = [
  { id: "prehled", label: "Přehled", icon: Wallet },
  { id: "ukoly", label: "Úkoly", icon: CheckSquare },
  { id: "cas", label: "Čas", icon: Clock },
  { id: "rozpocet", label: "Rozpočet", icon: Receipt },
  { id: "faktury", label: "Faktury", icon: FileText },
  { id: "objednavky", label: "Objednávky", icon: Package },
  { id: "naklady", label: "Náklady", icon: Wallet },
  { id: "soubory", label: "Soubory", icon: Paperclip },
  { id: "komentare", label: "Komentáře", icon: MessageSquare },
];

export function ProjectDetailTabs({
  projectId,
  activeTab,
  project,
  user,
  canEdit,
  totalHours,
  billableHours,
  projectUsers,
  budget,
  financeOverview,
  invoices,
  orders,
  files,
}: {
  projectId: string;
  activeTab: string;
  project: any;
  user: any;
  canEdit: boolean;
  totalHours: number;
  billableHours: number;
  projectUsers: { id: string; name: string }[];
  budget: any;
  financeOverview: any;
  invoices: any[];
  orders: any[];
  files: any[];
}) {
  const pathname = usePathname();

  // Overview tab content (default)
  const overdueTasks = project.tasks.filter(
    (t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "HOTOVO"
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-black/5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/projects/${projectId}?tab=${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors shrink-0",
                isActive
                  ? "border-[#6366F1] text-[#6366F1] font-medium"
                  : "border-transparent text-[#78716C] hover:text-[#1C1917] hover:border-[#D6D3D1]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "prehled" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget at a glance - money picture (half width, stacked) */}
            <BudgetBarsCard
              projectId={projectId}
              overview={financeOverview}
              canEdit={canEdit}
            />

            {/* Next tasks */}
            <div className="glass rounded-xl">
              <div className="px-5 py-4 border-b border-black/5">
                <h3 className="text-sm font-semibold text-[#1C1917]">Nejbližší úkoly</h3>
              </div>
              <div className="divide-y divide-black/5">
                {project.tasks
                  .slice(0, 5)
                  .map((task: any) => (
                    <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          task.status === "HOTOVO"
                            ? "bg-emerald-500"
                            : task.status === "V_PROCESU"
                            ? "bg-amber-500"
                            : task.status === "OTEVRENO"
                            ? "bg-sky-500"
                            : "bg-stone-300"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1C1917] truncate">{task.title}</p>
                        <p className="text-xs text-[#78716C]">
                          {task.assignee?.name || "Nepřiřazeno"}
                        </p>
                      </div>
                      {task.deadline && (
                        <span className="text-xs text-[#78716C] shrink-0">
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  ))}
                {project.tasks.length === 0 && (
                  <p className="px-5 py-8 text-sm text-[#78716C] text-center">
                    Žádné úkoly
                  </p>
                )}
              </div>
            </div>

            {/* Overview stats */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#1C1917] mb-4">Rychlý přehled</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/35 rounded-lg p-3">
                  <p className="text-xs text-[#78716C]">Úkolů celkem</p>
                  <p className="text-lg font-semibold text-[#1C1917]">{project.tasks.length}</p>
                </div>
                <div className="bg-white/35 rounded-lg p-3">
                  <p className="text-xs text-[#78716C]">Odpracováno</p>
                  <p className="text-lg font-semibold text-[#1C1917]">{totalHours}h</p>
                </div>
                <div className="bg-white/35 rounded-lg p-3">
                  <p className="text-xs text-[#78716C]">Fakturovatelných</p>
                  <p className="text-lg font-semibold text-[#1C1917]">{billableHours}h</p>
                </div>
                <div className="bg-white/35 rounded-lg p-3">
                  <p className="text-xs text-[#78716C]">Po deadline</p>
                  <p className="text-lg font-semibold text-[#1C1917]">{overdueTasks.length}</p>
                </div>
              </div>
              {project.budgetHours && (
                <div className="mt-4">
                  <p className="text-xs text-[#78716C] mb-1">
                    Vytížení rozpočtu: {Math.round((totalHours / project.budgetHours) * 100)}%
                  </p>
                  <div className="h-2 bg-white/35 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        (totalHours / project.budgetHours) > 0.8 ? "bg-rose-500" : "bg-[#6366F1]"
                      )}
                      style={{
                        width: `${Math.min(100, Math.round((totalHours / project.budgetHours) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Comments preview */}
            <div className="lg:col-span-2 glass rounded-xl">
              <div className="px-5 py-4 border-b border-black/5">
                <h3 className="text-sm font-semibold text-[#1C1917]">Poslední komentáře</h3>
              </div>
              <div className="divide-y divide-black/5">
                {project.comments.slice(0, 3).map((comment: any) => (
                  <div key={comment.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#1C1917]">{comment.author.name}</span>
                      <span className="text-xs text-[#78716C]">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[#78716C] whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
                {project.comments.length === 0 && (
                  <p className="px-5 py-8 text-sm text-[#78716C] text-center">
                    Zatím žádné komentáře
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ukoly" && (
          <ProjectTasksTab
            projectId={projectId}
            tasks={project.tasks}
            canEdit={canEdit}
            users={projectUsers}
          />
        )}
        {activeTab === "cas" && <ProjectTimeTab projectId={projectId} entries={project.timeEntries} userId={user.id} canEdit={canEdit} tasks={project.tasks} />}
        {activeTab === "rozpocet" && (
          <ProjectBudgetNewTab
            projectId={projectId}
            canEdit={canEdit}
            users={projectUsers}
            budget={budget}
          />
        )}
        {activeTab === "naklady" && <ProjectFinanceTab projectId={projectId} costs={project.costs} budgetAmount={project.budgetAmount} budgetHours={project.budgetHours} totalHours={totalHours} canEdit={canEdit} />}
        {activeTab === "faktury" && (
          <ProjectInvoicesTab projectId={projectId} invoices={invoices} canEdit={canEdit} hasBudget={financeOverview.hasBudget} />
        )}
        {activeTab === "objednavky" && (
          <ProjectOrdersTab projectId={projectId} orders={orders} canEdit={canEdit} />
        )}
        {activeTab === "soubory" && <ProjectFilesTab projectId={projectId} files={files} canEdit={canEdit} />}
        {activeTab === "komentare" && <ProjectCommentsTab projectId={projectId} comments={project.comments} userId={user.id} />}
      </div>
    </div>
  );
}

function formatDate(date: Date | string) {
  return format(new Date(date), "d.M.yyyy");
}
