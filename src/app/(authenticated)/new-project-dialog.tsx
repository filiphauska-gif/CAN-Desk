"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function NewProjectDialog({ users }: { users: { id: string; name: string; role: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  async function loadClients() {
    const mod = await import("@/server/actions/clients");
    const data = await mod.getClients();
    setClients(data);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      await createProject({
        name: form.get("name") as string,
        description: form.get("description") as string,
        clientId: form.get("clientId") as string,
        accountId: (form.get("accountId") as string) || undefined,
        deadline: form.get("deadline")
          ? new Date(form.get("deadline") as string)
          : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadClients(); }}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent btn-glass-primary text-white hover:bg-[#4F46E5] px-2.5 h-8 gap-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <Plus className="w-4 h-4" />
          Nová zakázka
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nová zakázka</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Název zakázky *
            </label>
            <input
              name="name"
              required
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              placeholder="Např. Jarní kampaň AutoMotiva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Klient *
            </label>
            <select
              name="clientId"
              required
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-white"
            >
              <option value="">Vyber klienta</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Account
            </label>
            <select
              name="accountId"
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] bg-white"
            >
              <option value="">Vyber account managera</option>
              {users
                .filter((u) => u.role === "ACCOUNT_MANAGER" || u.role === "ADMIN")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Deadline
            </label>
            <input
              name="deadline"
              type="date"
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          <p className="text-xs text-[#A8A29E]">
            Rozpočet a hodiny se zadávají až v detailu zakázky, v záložce Rozpočet.
          </p>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Popis / brief
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
              placeholder="Stručný popis zakázky..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="btn-glass-primary text-white"
            >
              {loading ? "Vytvářím..." : "Vytvořit zakázku"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
