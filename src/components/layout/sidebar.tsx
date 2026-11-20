"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Clock,
  Wallet,
  Settings,
  Mail,
  MessageSquare,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "./profile-menu";

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

const primaryTabs = navItems.filter((i) =>
  ["/", "/mail", "/projects", "/tasks"].includes(i.href)
);
const moreItems = navItems.filter((i) => !primaryTabs.some((p) => p.href === i.href));

export function Sidebar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const measurePill = () => {
    const idx = navItems.findIndex((i) => isActive(i.href));
    const links = navRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-nav]");
    const el = links?.[idx];
    if (el) setPill({ top: el.offsetTop, height: el.offsetHeight });
  };

  useLayoutEffect(() => {
    measurePill();
    // enable sliding only after the first placement
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("resize", measurePill);
    return () => window.removeEventListener("resize", measurePill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <div className="hidden lg:block w-[16.5rem] shrink-0 sticky top-0 h-screen p-3">
        <div className="flex flex-col h-full glass-strong rounded-2xl overflow-hidden">
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

          <nav ref={navRef} className="relative flex-1 px-3 py-3 overflow-y-auto">
            {/* sliding active pill */}
            {pill && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-3 right-3 rounded-xl bg-gradient-to-br from-[#6E70F5] to-[#5B5EE8] shadow-[0_6px_20px_-4px_rgba(99,102,241,0.55),inset_0_1px_1px_rgba(255,255,255,0.3)]",
                  animate && "transition-[transform,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                )}
                style={{ transform: `translateY(${pill.top}px)`, height: pill.height }}
              />
            )}

            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  data-nav
                  href={item.href}
                  className={cn(
                    "relative z-10 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors duration-200",
                    isActive(item.href)
                      ? "text-white"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-white/40"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <ProfileMenu />
        </div>
      </div>

      {/* ---------- Mobile: bottom tab bar ---------- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="glass-strong rounded-2xl shadow-[0_-8px_30px_rgba(76,71,106,0.18)] grid grid-cols-5 px-1 py-1.5">
          {primaryTabs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition-colors",
                isActive(item.href)
                  ? "text-[#6366F1] bg-[#6366F1]/10"
                  : "text-[#78716C] hover:text-[#1C1917]"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium text-[#78716C] hover:text-[#1C1917]"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>Více</span>
          </button>
        </div>
      </nav>

      {/* ---------- Mobile: "Více" bottom sheet ---------- */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            aria-label="Zavřít"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white/95 backdrop-blur-xl border-t border-white/60 shadow-[0_-16px_50px_rgba(76,71,106,0.3)] anim-sheet-in">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-sm font-semibold text-[#1C1917]">Menu</p>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-lg text-[#78716C] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 pb-2 grid grid-cols-3 gap-2">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[11px] font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-[#6366F1] text-white"
                      : "bg-black/[0.04] text-[#57534E]"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-black/5">
              <ProfileMenu />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
