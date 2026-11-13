"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isBefore } from "date-fns";
import { Plus, Pencil, Trash2, X, CheckSquare, Search } from "lucide-react";
import { PriorityBadge, taskStatusLabels } from "@/components/shared/status-badges";
import { createTask, updateTask, updateTaskAssignments, deleteTask } from "@/server/actions/tasks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  estimatedHours: number | null;
  deadline: string | null;
  projectId: string;
  projectName: string;
  clientName: string | null;
  assignees: { id: string; name: string }[];
};

export function TasksList({
  tasks,
  projects,
  users,
}: {
  tasks: TaskRow[];
  projects: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = q
    ? tasks.filter((t) =>
        [t.title, t.projectName, t.clientName || "", ...t.assignees.map((a) => a.name)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : tasks;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: TaskRow) {
    setEditing(task);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const assigneeIds = form.getAll("assigneeIds").map(String);
    const payload = {
      title: form.get("title") as string,
      description: (form.get("description") as string) || undefined,
      projectId: form.get("projectId") as string,
      priority: Number(form.get("priority")) || 0,
      deadline: form.get("deadline") ? new Date(form.get("deadline") as string) : undefined,
      estimatedHours: form.get("estimatedHours") ? Number(form.get("estimatedHours")) : undefined,
    };
    try {
      if (editing) {
        await updateTask(editing.id, {
          ...payload,
          status: form.get("status") as string,
          deadline: payload.deadline ?? null,
          estimatedHours: payload.estimatedHours ?? null,
        });
        await updateTaskAssignments(editing.id, assigneeIds);
      } else {
        await createTask({ ...payload, assigneeIds: assigneeIds.length ? assigneeIds : undefined });
      }
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(taskId: string, status: string) {
    await updateTask(taskId, { status });
    router.refresh();
  }

  async function handleDelete(task: TaskRow) {
    if (!confirm(`Smazat úkol "${task.title}"?`)) return;
    await deleteTask(task.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat úkol, zakázku, člověka..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/40 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>
        <Button size="sm" className="gap-2 btn-glass-primary text-white" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nový úkol
        </Button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="glass-strong rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1C1917]">
              {editing ? "Upravit úkol" : "Nový úkol"}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/60 text-[#78716C]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            name="title"
            required
            placeholder="Název úkolu"
            defaultValue={editing?.title || ""}
            className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Zadání / poznámky"
            defaultValue={editing?.description || ""}
            className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
          />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs text-[#78716C] mb-1">Zakázka</label>
              <select
                name="projectId"
                required
                defaultValue={editing?.projectId || projects[0]?.id}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {editing && (
              <div>
                <label className="block text-xs text-[#78716C] mb-1">Stav</label>
                <select
                  name="status"
                  defaultValue={editing.status}
                  className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white"
                >
                  {Object.entries(taskStatusLabels).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Priorita</label>
              <select
                name="priority"
                defaultValue={editing?.priority ?? 0}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white"
              >
                <option value="0">Normální</option>
                <option value="1">Vysoká</option>
                <option value="2">Urgentní</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Deadline</label>
              <input
                name="deadline"
                type="date"
                defaultValue={editing?.deadline ? editing.deadline.slice(0, 10) : ""}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Limit (h)</label>
              <input
                name="estimatedHours"
                type="number"
                step="0.5"
                defaultValue={editing?.estimatedHours ?? ""}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#78716C] mb-1">Přiřazení</label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/40 text-sm cursor-pointer hover:bg-white/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    name="assigneeIds"
                    value={u.id}
                    defaultChecked={editing?.assignees.some((a) => a.id === u.id)}
                    className="rounded"
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="btn-glass-primary text-white">
              {loading ? "Ukládám..." : editing ? "Uložit změny" : "Vytvořit úkol"}
            </Button>
          </div>
        </form>
      )}

      <div className="glass rounded-xl">
        <div className="divide-y divide-black/5">
          {visible.map((task) => {
            const overdue =
              task.deadline && task.status !== "DONE" && isBefore(new Date(task.deadline), new Date());
            return (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/40 transition-colors">
                <select
                  value={task.status}
                  onChange={(e) => handleStatus(task.id, e.target.value)}
                  className="text-xs px-2 py-1 rounded-lg border border-white/40 bg-white/70 text-[#57534E] shrink-0"
                  title="Změnit stav"
                >
                  {Object.entries(taskStatusLabels).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1C1917] truncate">{task.title}</p>
                  <p className="text-xs text-[#78716C] truncate">
                    {task.projectName}
                    {task.clientName && ` • ${task.clientName}`}
                    {task.assignees.length > 0 && ` • ${task.assignees.map((a) => a.name).join(", ")}`}
                  </p>
                </div>
                {task.priority > 0 && <PriorityBadge priority={task.priority} />}
                {task.deadline && (
                  <span className={cn("text-xs shrink-0", overdue ? "text-rose-500 font-medium" : "text-[#78716C]")}>
                    {format(new Date(task.deadline), "d.M.")}
                  </span>
                )}
                <button
                  onClick={() => openEdit(task)}
                  title="Upravit úkol"
                  className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#6366F1] hover:bg-white/70 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(task)}
                  title="Smazat úkol"
                  className="p-1.5 rounded-lg text-[#A8A29E] hover:text-rose-500 hover:bg-white/70 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="px-5 py-12 text-center">
              <CheckSquare className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
              <p className="text-[#78716C]">{q ? "Nic nenalezeno" : "Žádné úkoly"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
