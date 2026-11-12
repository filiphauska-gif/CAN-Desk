"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTimeEntry } from "@/server/actions/time";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";

export function ProjectTimeTab({
  projectId,
  entries,
  userId,
  canEdit,
  tasks,
}: {
  projectId: string;
  entries: any[];
  userId: string;
  canEdit: boolean;
  tasks: any[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await createTimeEntry({
        hours: Number(form.get("hours")),
        date: new Date(form.get("date") as string),
        description: (form.get("description") as string) || undefined,
        billable: form.get("billable") === "true",
        projectId,
        userId,
        taskId: (form.get("taskId") as string) || undefined,
      });
      setShowForm(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary + Add */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="glass rounded-lg px-4 py-2">
            <p className="text-xs text-[#78716C]">Celkem</p>
            <p className="text-lg font-semibold text-[#1C1917]">{totalHours}h</p>
          </div>
          <div className="glass rounded-lg px-4 py-2">
            <p className="text-xs text-[#78716C]">Fakturovatelné</p>
            <p className="text-lg font-semibold text-emerald-600">{billableHours}h</p>
          </div>
          <div className="glass rounded-lg px-4 py-2">
            <p className="text-xs text-[#78716C]">Nefakturovatelné</p>
            <p className="text-lg font-semibold text-[#78716C]">{totalHours - billableHours}h</p>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
            Zapsat čas
          </Button>
        )}
      </div>

      {/* Time entry form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Datum</label>
              <input
                name="date"
                type="date"
                required
                defaultValue={format(new Date(), "yyyy-MM-dd")}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Hodiny</label>
              <input
                name="hours"
                type="number"
                step="0.5"
                required
                placeholder="2.5"
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Úkol</label>
              <select name="taskId" className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white">
                <option value="">Bez úkolu</option>
                {tasks
                  .filter((t: any) => t.status !== "DONE")
                  .map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.title.substring(0, 40)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#78716C] mb-1">Typ</label>
              <select name="billable" defaultValue="true" className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white">
                <option value="true">Fakturovatelný</option>
                <option value="false">Nefakturovatelný</option>
              </select>
            </div>
          </div>
          <div>
            <input
              name="description"
              placeholder="Popis práce (volitelný)"
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Zrušit
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="btn-glass-primary text-white">
              {loading ? "..." : "Uložit"}
            </Button>
          </div>
        </form>
      )}

      {/* Time entries list */}
      <div className="glass rounded-xl">
        <div className="divide-y divide-black/5">
          {entries.map((entry: any) => (
            <div key={entry.id} className="px-5 py-3 flex items-center gap-4">
              <Clock className="w-4 h-4 text-[#78716C] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1C1917] truncate">
                  {entry.description || "Bez popisu"}
                </p>
                <div className="flex items-center gap-3 text-xs text-[#78716C]">
                  <span>{entry.user.name}</span>
                  {entry.task && <span>{entry.task.title}</span>}
                  <span>{format(new Date(entry.date), "d.M.")}</span>
                  <span
                    className={
                      entry.billable ? "text-emerald-600" : "text-[#A8A29E]"
                    }
                  >
                    {entry.billable ? "Fakt." : "Nefakt."}
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium text-[#1C1917] shrink-0">
                {entry.hours}h
              </span>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="px-5 py-8 text-sm text-[#78716C] text-center">
              Zatím žádný čas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
