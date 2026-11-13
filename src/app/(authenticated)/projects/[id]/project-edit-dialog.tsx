"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectEditDialog({
  project,
  clients,
  users,
}: {
  project: any;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await updateProject(project.id, {
        name: form.get("name") as string,
        clientId: form.get("clientId") as string,
        accountId: (form.get("accountId") as string) || undefined,
        deadline: form.get("deadline") ? new Date(form.get("deadline") as string) : null,
        description: (form.get("description") as string) || undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmtDate = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Upravit zakázku"
        className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#6366F1] hover:bg-white/60 transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative glass-strong rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1C1917]">Upravit zakázku</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/60 text-[#78716C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#78716C] mb-1">Název</label>
              <input
                name="name"
                required
                defaultValue={project.name}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#78716C] mb-1">Klient</label>
                <select
                  name="clientId"
                  defaultValue={project.clientId}
                  className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#78716C] mb-1">Account</label>
                <select
                  name="accountId"
                  defaultValue={project.accountId || ""}
                  className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm bg-white"
                >
                  <option value="">-</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#78716C] mb-1">Deadline</label>
              <input
                name="deadline"
                type="date"
                defaultValue={fmtDate(project.deadline)}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-[#78716C] mb-1">Popis</label>
              <textarea
                name="description"
                rows={4}
                defaultValue={project.description || ""}
                placeholder="Stručný brief zakázky..."
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Zrušit
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="btn-glass-primary text-white">
                {loading ? "Ukládám..." : "Uložit"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
