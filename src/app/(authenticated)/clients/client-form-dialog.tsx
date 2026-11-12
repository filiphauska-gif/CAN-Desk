"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/server/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function ClientFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      await createClient({
        name: form.get("name") as string,
        email: (form.get("email") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        contactName: (form.get("contactName") as string) || undefined,
        note: (form.get("note") as string) || undefined,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent btn-glass-primary text-white hover:bg-[#4F46E5] px-2.5 h-8 gap-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <Plus className="w-4 h-4" />
          Nový klient
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nový klient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Název společnosti *
            </label>
            <input
              name="name"
              required
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              placeholder="Např. AutoMotiva s.r.o."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Kontaktní osoba
              </label>
              <input
                name="contactName"
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                placeholder="Jméno"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Telefon
              </label>
              <input
                name="phone"
                type="tel"
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                placeholder="+420..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              placeholder="info@klient.cz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Poznámka
            </label>
            <textarea
              name="note"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
              placeholder="Interní poznámka..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={loading} className="btn-glass-primary text-white">
              {loading ? "Ukládám..." : "Vytvořit klienta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
