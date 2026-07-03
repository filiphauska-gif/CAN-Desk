"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Clock,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Zakázky", icon: FolderKanban },
  { href: "/tasks", label: "Úkoly", icon: CheckSquare },
  { href: "/clients", label: "Klienti", icon: Users },
  { href: "/time", label: "Čas", icon: Clock },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/settings", label: "Nastavení", icon: Settings },
];

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNT_MANAGER: "Account Manager",
  PROJECT_MANAGER: "Project Manager",
  KREATIVEC: "Kreativec",
  PRODUKCNI: "Produkční",
  EXTERNISTA: "Externista",
  FINANCE: "Finance",
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = session?.user as any;

  const content = (
    <div className="flex flex-col h-screen bg-[#FAF8F5] border-r border-[#E7E5E4]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E7E5E4]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white text-sm font-bold">
            CD
          </div>
          <div>
            <span className="font-semibold text-[#1C1917] text-sm">CAN Desk</span>
          </div>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-5 py-3 border-b border-[#E7E5E4]">
          <p className="text-sm font-medium text-[#1C1917] truncate">{user.name}</p>
          <p className="text-xs text-[#78716C]">{roleLabels[user.role] || user.role}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-[#6366F1] text-white"
                  : "text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Odhlásit se</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-white border border-[#E7E5E4] rounded-lg p-2 shadow-sm"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-56 shrink-0">{content}</aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-56 z-50 shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
