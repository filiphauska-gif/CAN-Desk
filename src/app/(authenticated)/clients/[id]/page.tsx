import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClient } from "@/server/actions/clients";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import Link from "next/link";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ArrowLeft, Mail, Phone, Building2, User } from "lucide-react";
import { notFound } from "next/navigation";
import { ClientEditDialog } from "./client-edit-dialog";
import { DeleteClientButton } from "@/components/shared/delete-client-button";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const client = await getClient(id);
  if (!client) notFound();

  const canEdit = ["ADMIN", "FINANCE", "ACCOUNT_MANAGER"].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="p-2 rounded-lg hover:bg-white/40 text-[#78716C] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#1C1917]">
              {client.name}
            </h1>
            {canEdit && (
              <div className="flex items-center gap-2">
                <ClientEditDialog client={client} />
                <DeleteClientButton clientId={client.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info + Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1C1917] mb-4">
            Kontaktní informace
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#78716C]" />
              <div>
                <p className="text-xs text-[#78716C]">Kontaktní osoba</p>
                <p className="text-sm text-[#1C1917]">
                  {client.contactName || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#78716C]" />
              <div>
                <p className="text-xs text-[#78716C]">Email</p>
                <p className="text-sm text-[#1C1917]">
                  {client.email || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#78716C]" />
              <div>
                <p className="text-xs text-[#78716C]">Telefon</p>
                <p className="text-sm text-[#1C1917]">
                  {client.phone || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-[#78716C]" />
              <div>
                <p className="text-xs text-[#78716C]">Projektů celkem</p>
                <p className="text-sm text-[#1C1917]">
                  {client.projects.length}
                </p>
              </div>
            </div>
          </div>
          {client.note && (
            <div className="mt-4 pt-4 border-t border-black/5">
              <p className="text-xs text-[#78716C] mb-1">Poznámka</p>
              <p className="text-sm text-[#1C1917]">{client.note}</p>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1C1917] mb-4">
            Přehled
          </h2>
          {(() => {
            const activeProjects = client.projects.filter(
              (p) => p.status === "BEZI" || p.status === "V_PRIPRAVE"
            ).length;
            const finishedProjects = client.projects.filter(
              (p) =>
                p.status === "DOKONCENO" ||
                p.status === "FAKTUROVANO" ||
                p.status === "ARCHIVOVANO"
            ).length;
            return (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#78716C]">Aktivní zakázky</span>
                  <span className="font-medium">{activeProjects}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#78716C]">Dokončeno</span>
                  <span className="font-medium">{finishedProjects}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#78716C]">Klient od</span>
                  <span className="font-medium">
                    {format(client.createdAt, "MMMM yyyy", { locale: cs })}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Projects */}
      <div className="glass rounded-xl">
        <div className="px-5 py-4 border-b border-black/5">
          <h2 className="text-sm font-semibold text-[#1C1917]">Projekty</h2>
        </div>
        <div className="divide-y divide-black/5">
          {client.projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-white/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1C1917] truncate">
                  {project.name}
                </p>
                <p className="text-xs text-[#78716C]">
                  {(project.account as any)?.name || "Bez accounta"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {project.deadline && (
                  <span className="text-xs text-[#78716C]">
                    {format(project.deadline, "d.M.yyyy")}
                  </span>
                )}
                <ProjectStatusBadge status={project.status} />
              </div>
            </Link>
          ))}
          {client.projects.length === 0 && (
            <p className="px-5 py-8 text-sm text-[#78716C] text-center">
              Žádné projekty pro tohoto klienta
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
