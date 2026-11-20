import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Settings, Shield, DollarSign, Tag } from "lucide-react";
import { FontSizeCard } from "../font-size-card";
import { ResetDashboardCard } from "../reset-dashboard-card";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  FINANCE: "Finance",
  ACCOUNT_MANAGER: "Account Manager",
  PROJECT_MANAGER: "Project Manager",
  KREATIVEC: "Kreativec",
  PRODUKCNI: "Produkční",
  EXTERNISTA: "Externista",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  if (!["ADMIN", "FINANCE"].includes(user.role)) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hourlyRate: true,
      active: true,
    },
  });

  return (
    <div className="space-y-6">
      <ResetDashboardCard />
      <FontSizeCard />
      <div>
        <h1 className="text-xl font-semibold text-[#1C1917]">Nastavení</h1>
        <p className="text-sm text-[#78716C] mt-0.5">
          Správa uživatelů a konfigurace systému
        </p>
      </div>

      {/* Users */}
      <div className="glass rounded-xl">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5">
          <Shield className="w-4 h-4 text-[#78716C]" />
          <h2 className="text-sm font-semibold text-[#1C1917]">Uživatelé</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs text-[#78716C]">
                <th className="text-left px-5 py-3 font-medium">Jméno</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-right px-5 py-3 font-medium">
                  Hodinová sazba
                </th>
                <th className="text-center px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1C1917]">
                    {u.name}
                  </td>
                  <td className="px-5 py-3 text-[#78716C]">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs bg-white/35 text-[#78716C]">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.hourlyRate
                      ? `${u.hourlyRate.toLocaleString("cs-CZ")} Kč/h`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        u.active ? "bg-emerald-500" : "bg-rose-400"
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-[#78716C]" />
            <h3 className="text-sm font-semibold text-[#1C1917]">Sazby</h3>
          </div>
          <p className="text-sm text-[#78716C]">
            Hodinové sazby se nastavují u každého uživatele v databázi.
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-[#78716C]" />
            <h3 className="text-sm font-semibold text-[#1C1917]">Typy zakázek a statusy</h3>
          </div>
          <p className="text-sm text-[#78716C]">
            Statusy zakázek a úkolů jsou definovány v databázovém schématu.
          </p>
        </div>
      </div>
    </div>
  );
}
