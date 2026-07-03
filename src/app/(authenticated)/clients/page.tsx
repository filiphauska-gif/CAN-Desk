import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClients } from "@/server/actions/clients";
import Link from "next/link";
import { Plus, Mail, Phone, Building2 } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const clients = await getClients();

  const canEdit = ["ADMIN", "FINANCE", "ACCOUNT_MANAGER", "PROJECT_MANAGER"].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Klienti</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {clients.length} aktivních klientů
          </p>
        </div>
        {canEdit && <ClientFormDialog />}
      </div>

      <div className="grid gap-4">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="bg-white rounded-xl border border-[#E7E5E4] p-5 hover:border-[#6366F1]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#F5F5F4] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#78716C]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#1C1917]">{client.name}</h3>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {client.contactName && (
                      <span className="text-xs text-[#78716C]">
                        {client.contactName}
                      </span>
                    )}
                    {client.email && (
                      <span className="text-xs text-[#78716C] flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="text-xs text-[#78716C] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </span>
                    )}
                  </div>
                  {client.note && (
                    <p className="text-xs text-[#78716C] mt-2 line-clamp-1">
                      {client.note}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-[#1C1917]">
                  {client._count.projects}
                </p>
                <p className="text-xs text-[#78716C]">projektů</p>
              </div>
            </div>
          </Link>
        ))}
        {clients.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 text-center">
            <Building2 className="w-12 h-12 text-[#D6D3D1] mx-auto mb-3" />
            <p className="text-[#78716C]">Zatím žádní klienti</p>
            <p className="text-sm text-[#A8A29E] mt-1">
              Přidejte prvního klienta tlačítkem nahoře
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
