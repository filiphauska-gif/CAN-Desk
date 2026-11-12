"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClient } from "@/server/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export function ClientEditDialog({
  client,
}: {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    contactName: string | null;
    note: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      await updateClient(client.id, {
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
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg glass hover:bg-white/40 px-2 h-7 gap-1 text-[0.8rem] font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer text-[#1C1917] [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
          <Pencil className="w-3 h-3" />
          Upravit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upravit klienta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Název společnosti *
            </label>
            <input
              name="name"
              required
              defaultValue={client.name}
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Kontaktní osoba
              </label>
              <input
                name="contactName"
                defaultValue={client.contactName || ""}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Telefon
              </label>
              <input
                name="phone"
                defaultValue={client.phone || ""}
                className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
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
              defaultValue={client.email || ""}
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Poznámka
            </label>
            <textarea
              name="note"
              rows={2}
              defaultValue={client.note || ""}
              className="w-full px-3 py-2 rounded-lg border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={loading} className="btn-glass-primary text-white">
              {loading ? "Ukládám..." : "Uložit změny"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
