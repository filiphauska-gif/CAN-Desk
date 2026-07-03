"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "@/server/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteClient(clientId);
      router.push("/clients");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-3 h-3" />
        Smazat
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat klienta?</DialogTitle>
            <DialogDescription>
              Tato akce klienta deaktivuje. Všechny související projekty zůstanou zachovány.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="outline"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Mažu..." : "Smazat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
