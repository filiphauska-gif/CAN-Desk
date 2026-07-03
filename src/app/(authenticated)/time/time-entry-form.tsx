"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTimeEntry } from "@/server/actions/time";
import { Button } from "@/components/ui/button";
import { Plus, Send } from "lucide-react";

export function TimeEntryForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  async function loadProjects() {
    const mod = await import("@/server/actions/projects");
    const data = await mod.getProjects();
    setProjects(data);
  }

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
        projectId: form.get("projectId") as string,
        userId,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-[#E7E5E4] p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-[#1C1917]">Rychlý záznam času</h2>

      <div>
        <select
          name="projectId"
          required
          onClick={loadProjects}
          onFocus={loadProjects}
          className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
        >
          <option value="">Vyber projekt...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#78716C] mb-1">Datum</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm"
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
            className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#78716C] mb-1">Popis</label>
        <input
          name="description"
          placeholder="Co jsi dělal?"
          className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <select
          name="billable"
          defaultValue="true"
          className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm bg-white"
        >
          <option value="true">Fakturovatelný</option>
          <option value="false">Nefakturovatelný</option>
        </select>
        <Button
          type="submit"
          disabled={loading}
          size="sm"
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white ml-auto gap-2"
        >
          <Send className="w-3 h-3" />
          {loading ? "..." : "Uložit"}
        </Button>
      </div>
    </form>
  );
}
