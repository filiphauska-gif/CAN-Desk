"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTask, updateTask } from "@/server/actions/tasks";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/status-badges";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ProjectTasksTab({
  projectId,
  tasks,
  canEdit,
  users,
}: {
  projectId: string;
  tasks: any[];
  canEdit: boolean;
  users?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>(users || []);

  useEffect(() => {
    if (!users || users.length === 0) {
      // Load users from the server
      fetch("/api/auth/session").then(() => {
        // We'll just use provided users or a predefined list
      });
    }
  }, []);

  const columns = [
    { key: "BACKLOG", label: "Backlog" },
    { key: "TODO", label: "To do" },
    { key: "IN_PROGRESS", label: "Probíhá" },
    { key: "WAITING", label: "Čeká" },
    { key: "REVIEW", label: "Revize" },
    { key: "DONE", label: "Hotovo" },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const assigneeIds = form.getAll("assigneeIds").map((v) => String(v));
    try {
      await createTask({
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        projectId,
        priority: Number(form.get("priority")) || 0,
        deadline: form.get("deadline")
          ? new Date(form.get("deadline") as string)
          : undefined,
        estimatedHours: form.get("estimatedHours")
          ? Number(form.get("estimatedHours"))
          : undefined,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      });
      setShowForm(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId: string, status: string) {
    setDragTaskId(null);
    await updateTask(taskId, { status });
    router.refresh();
  }

  // Drag & Drop
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    if (!canEdit) return;
    setDragTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }, [canEdit]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragTaskId(null);
    if (!canEdit) return;
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t: any) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      await handleStatusChange(taskId, targetStatus);
    }
  }, [canEdit, tasks]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#78716C]">{tasks.length} úkolů</p>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-4 h-4" />
            Nový úkol
          </Button>
        )}
      </div>

      {/* New task form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-[#E7E5E4] p-4 space-y-3"
        >
          <input
            name="title"
            required
            placeholder="Název úkolu"
            className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Zadání / poznámky"
            className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Priorita</label>
              <select name="priority" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white">
                <option value="0">Normální</option>
                <option value="1">Vysoká</option>
                <option value="2">Urgentní</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Deadline</label>
              <input name="deadline" type="date" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm" />
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Limit (hod)</label>
              <input name="estimatedHours" type="number" step="0.5" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#78716C] mb-1">Přiřazení členové teamu</label>
            <div className="flex flex-wrap gap-2">
              {allUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-sm cursor-pointer hover:bg-[#F5F5F4] transition-colors">
                  <input type="checkbox" name="assigneeIds" value={u.id} className="rounded" />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Zrušit
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="bg-[#6366F1] text-white">
              {loading ? "..." : "Vytvořit úkol"}
            </Button>
          </div>
        </form>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {columns.map((col) => {
          const colTasks = tasks.filter((t: any) => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className="bg-[#FAF8F5] rounded-xl border border-[#E7E5E4] p-3 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-[#78716C]">{col.label}</span>
                <span className="text-xs text-[#A8A29E]">{colTasks.length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {colTasks.map((task: any) => {
                  const assignedUsers = [
                    ...(task.assignee ? [{ name: task.assignee.name }] : []),
                    ...(task.assignments?.map((a: any) => ({ name: a.user.name })) || []),
                  ];
                  // Deduplicate
                  const uniqueUsers = assignedUsers.filter(
                    (u, i, arr) => arr.findIndex((x) => x.name === u.name) === i
                  );

                  return (
                    <div
                      key={task.id}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={cn(
                        "bg-white rounded-lg border border-[#E7E5E4] p-3 space-y-1.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow",
                        dragTaskId === task.id && "opacity-50"
                      )}
                    >
                      <p className="text-sm text-[#1C1917] leading-snug">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.priority > 0 && <PriorityBadge priority={task.priority} />}
                        {task.deadline && (
                          <span className="text-xs text-[#78716C]">{format(new Date(task.deadline), "d.M.")}</span>
                        )}
                        {task.estimatedHours && (
                          <span className="text-xs text-[#78716C]">{task.estimatedHours}h</span>
                        )}
                      </div>
                      {uniqueUsers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {uniqueUsers.map((u: any, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F5F4] text-[#78716C]">
                              {u.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
