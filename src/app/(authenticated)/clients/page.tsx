import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClients } from "@/server/actions/clients";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientsList } from "./clients-list";

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

      <ClientsList
        clients={clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          contactName: c.contactName ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
          note: c.note ?? null,
          projectsCount: c._count.projects,
          projects: (c.projects || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            deadline: p.deadline ? new Date(p.deadline).toISOString() : null,
          })),
        }))}
      />
    </div>
  );
}
