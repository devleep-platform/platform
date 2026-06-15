"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, List, Archive, Settings, Users,
  Terminal, Menu, LogOut, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { Logo } from "@/components/ui/Logo";

const MISSION_CONTROL = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/catalog",   icon: List,            label: "Incidents" },
  { href: "/tracks",    icon: Archive,         label: "Tracks" },
  { href: "/docs",      icon: BookOpen,        label: "Docs" },
];

const COMMUNITY = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

const ROUTE_TITLES: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/catalog",   "Incident Catalog"],
  ["/tracks",    "Training Tracks"],
  ["/settings",  "Settings"],
  ["/docs",      "Docs"],
  ["/labs",      "Active Lab Environment"],
];

interface DarkAppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function DarkAppShell({ children }: DarkAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();

  // Start open on desktop, closed on mobile
  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const viewTitle =
    ROUTE_TITLES.find(([path]) => pathname === path || pathname.startsWith(path + "/"))?.[1]
    ?? "DevLeep";

  const avatarInitial = (user?.name?.[0] ?? user?.email?.[0] ?? "O").toUpperCase();
  const displayName = user?.name?.split(" ")[0] ?? "Operator";

  return (
    <div className="flex h-screen bg-[#070B11] text-slate-300 font-sans overflow-hidden">

      {/* Mobile backdrop — tap outside to close */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[15] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "border-r border-[#1E293B] bg-[#070B11] flex flex-col font-mono text-xs uppercase z-20 transition-all duration-300 shrink-0",
          // Mobile: fixed overlay drawer; Desktop: normal flow sidebar
          "fixed inset-y-0 left-0 lg:static lg:inset-auto",
          sidebarOpen
            ? "translate-x-0 w-72 lg:w-64"
            : "-translate-x-full w-72 lg:translate-x-0 lg:w-16"
        )}
      >
        {/* Brand header */}
        <div className="h-14 border-b border-[#1E293B] flex items-center px-4 bg-[#0F172A] overflow-hidden whitespace-nowrap">
          <Logo collapsed={!sidebarOpen} />
        </div>

        {/* Mission Control label */}
        <div className="px-4 py-3 text-slate-500 font-bold border-b border-[#1E293B] flex justify-between items-center bg-[#070B11] overflow-hidden whitespace-nowrap">
          {sidebarOpen && <span>Mission Control</span>}
          <Terminal size={12} className="shrink-0" />
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto py-2 overflow-x-hidden">
          {MISSION_CONTROL.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={!sidebarOpen ? label : undefined}
                className={cn(
                  "w-full flex items-center py-2.5 transition-colors border-l-2",
                  sidebarOpen ? "px-4" : "justify-center",
                  active
                    ? "border-[#38BDF8] bg-[#0F172A] text-white"
                    : "border-transparent text-slate-400 hover:bg-[#0F172A]/50 hover:text-slate-200"
                )}
              >
                <Icon
                  size={14}
                  className={cn("shrink-0", active && "text-[#38BDF8]")}
                />
                {sidebarOpen && <span className="ml-3 truncate">{label}</span>}
              </Link>
            );
          })}

          {/* Community section */}
          <div className="px-4 py-3 text-slate-500 font-bold border-y border-[#1E293B] mt-4 mb-2 flex justify-between items-center overflow-hidden whitespace-nowrap">
            {sidebarOpen && <span>Community</span>}
            <Users size={12} className="shrink-0" />
          </div>

          {COMMUNITY.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={!sidebarOpen ? label : undefined}
                className={cn(
                  "w-full flex items-center py-2.5 border-l-2 text-slate-400 hover:bg-[#0F172A]/50 hover:text-slate-200 transition-colors",
                  sidebarOpen ? "px-4" : "justify-center",
                  active
                    ? "border-[#38BDF8] bg-[#0F172A] text-white"
                    : "border-transparent"
                )}
              >
                <Icon
                  size={14}
                  className={cn("shrink-0", active && "text-[#38BDF8]")}
                />
                {sidebarOpen && <span className="ml-3 truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div className="border-t border-[#1E293B] bg-[#0F172A] overflow-hidden whitespace-nowrap">
          <div className={cn(
            "flex items-center gap-2 p-4",
            !sidebarOpen && "justify-center px-0"
          )}>
            <div className="w-8 h-8 rounded bg-[#1E293B] shrink-0 flex items-center justify-center">
              <span className="text-[#38BDF8] font-bold text-sm">{avatarInitial}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold leading-tight normal-case text-xs truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-[#38BDF8]">L2 Engineer</div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={!sidebarOpen ? "Log out" : undefined}
            className={cn(
              "w-full flex items-center py-2.5 border-t border-[#1E293B] text-slate-500 hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors",
              sidebarOpen ? "px-4 gap-3" : "justify-center"
            )}
          >
            <LogOut size={14} className="shrink-0" />
            {sidebarOpen && <span className="text-xs uppercase tracking-widest">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative grid-bg h-screen overflow-y-auto min-w-0">
        {/* Scanline overlay */}
        <div className="scanline opacity-[0.06] pointer-events-none z-0" />

        {/* Top bar */}
        <div className="h-14 border-b border-[#1E293B] bg-[#0F172A]/80 backdrop-blur sticky top-0 z-30 flex items-center px-4 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-[#1E293B] rounded transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="ml-4 text-white font-mono text-xs uppercase font-bold tracking-widest">
            {viewTitle}
          </div>
        </div>

        {/* Page content */}
        <div className="relative z-10 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
