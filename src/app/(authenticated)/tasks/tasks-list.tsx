"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isBefore, addDays } from "date-fns";
import { Plus, Pencil, Trash2, X, CheckSquare, Search } from "lucide-react";
import { PriorityBadge, taskStatusLabels } from "@/components/shared/status-badges";
import { createTask, updateTask, updateTaskAssignments, deleteTask } from "@/server/actions/tasks";
import { uploadTaskFiles, deleteAttachment } from "@/server/actions/files";
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
  attachments?: { id: string; name: string; size: number }[];
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
  const [quick, setQuick] = useState<"all" | "overdue" | "week">("all");
  const [view, setView] = useState<"list" | "board">("board");

  const now = new Date();
  const q = query.trim().toLowerCase();
  const visible = tasks
    .filter((t) => {
      if (quick === "overdue") return t.deadline && t.status !== "HOTOVO" && isBefore(new Date(t.deadline), now);
      if (quick === "week")
        return t.deadline && t.status !== "HOTOVO" && !isBefore(addDays(now, 7), new Date(t.deadline));
      return true;
    })
    .filter((t) =>
      q
        ? [t.title, t.projectName, t.clientName || "", ...t.assignees.map((a) => a.name)]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true
    );

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

  async function handleTaskUpload(taskId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((fl) => fd.append("files", fl));
    await uploadTaskFiles(taskId, fd);
    e.target.value = "";
    router.refresh();
  }

  async function handleStatus(taskId: string, status: string) {
    await updateTask(taskId, { status });
    router.refresh();
  }

  async function handleDelete(task: TaskRow) {
    await deleteTask(task.id);
    router.refresh();
  }

  // Kanban drag & drop
  const boardColumns = ["PRIPRAVA", "OTEVRENO", "V_PROCESU", "U_KLIENTA", "HOTOVO"];

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) handleStatus(id, status);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat úkol, zakázku, člověka..."
              className="w-64 pl-8 pr-3 py-1.5 rounded-lg border border-white/40 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          <div className="flex gap-1.5 border-l border-black/10 pl-2">
            {(
              [
                ["list", "Seznam"],
                ["board", "Board"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs border transition-colors",
                  view === key
                    ? "bg-[#1C1917] text-white border-[#1C1917]"
                    : "bg-white border-white/40 text-[#78716C] hover:border-[#1C1917]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
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

          {editing && (
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Přílohy</label>
              <div className="space-y-1.5">
                {(editing.attachments || []).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-[#1C1917]">
                    <a href={`/api/files/${a.id}`} className="text-[#6366F1] hover:underline truncate flex-1">{a.name}</a>
                    <button type="button" onClick={async () => { await deleteAttachment(a.id); router.refresh(); }} className="text-[#A8A29E] hover:text-rose-500">✕</button>
                  </div>
                ))}
                <input type="file" multiple onChange={(e) => handleTaskUpload(editing.id, e)} className="text-xs" />
              </div>
            </div>
          )}
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

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2 items-start">
          {boardColumns.map((status) => {
            const columnTasks = visible.filter((t) => t.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, status)}
                className="glass rounded-xl p-3 w-[240px] shrink-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#57534E]">{taskStatusLabels[status]}</p>
                  <span className="text-[10px] text-[#A8A29E] bg-white/60 rounded-full px-1.5">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[70px]">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onClick={() => openEdit(task)}
                      className="bg-white rounded-lg border border-black/5 p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-[#6366F1]/30 transition-all"
                      title="Přetáhni do jiného sloupce nebo klikni pro úpravu"
                    >
                      <p className="text-xs font-medium text-[#1C1917] leading-snug mb-1">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-[#78716C] truncate">{task.projectName}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span>
                          {task.priority > 0 ? <PriorityBadge priority={task.priority} /> : null}
                        </span>
                        {task.deadline && (
                          <span
                            className={cn(
                              "text-[10px]",
                              task.status !== "HOTOVO" &&
                                isBefore(new Date(task.deadline), new Date())
                                ? "text-rose-500 font-medium"
                                : "text-[#A8A29E]"
                            )}
                          >
                            {format(new Date(task.deadline), "d.M.")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <p className="text-[10px] text-[#D6D3D1] text-center py-4">Prázdné</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-xl">
          <div className="divide-y divide-black/5">
            {visible.map((task) => {
            const overdue =
              task.deadline && task.status !== "HOTOVO" && isBefore(new Date(task.deadline), new Date());
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
      )}
    </div>
  );
}
