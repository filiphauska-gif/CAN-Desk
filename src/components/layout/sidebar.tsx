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
  Mail,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mail", label: "Pošta", icon: Mail },
  { href: "/chat", label: "Chat", icon: MessageSquare },
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
    <div className="flex flex-col h-full glass-strong rounded-2xl overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-black/5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6E70F5] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-bold shadow-[0_4px_14px_rgba(99,102,241,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]">
            CD
          </div>
          <div>
            <span className="font-semibold text-[#1C1917] text-sm">CAN Desk</span>
            <p className="text-[10px] text-[#78716C] leading-tight">Can Agency</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-5 py-3 border-b border-black/5">
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
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200",
                isActive
                  ? "bg-gradient-to-br from-[#6E70F5] to-[#5B5EE8] text-white shadow-[0_4px_16px_-2px_rgba(99,102,241,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                  : "text-[#57534E] hover:bg-white/50 hover:text-[#1C1917]"
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
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#78716C] hover:bg-white/50 hover:text-[#1C1917] transition-colors w-full"
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
        className="fixed top-3 left-3 z-50 lg:hidden glass rounded-xl p-2"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop sidebar — floating glass panel */}
      <aside className="hidden lg:block lg:w-[16.5rem] shrink-0">
        <div className="fixed top-0 left-0 bottom-0 w-[16.5rem] p-3">
          {content}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 p-3">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
