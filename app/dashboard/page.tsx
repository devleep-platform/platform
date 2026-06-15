"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Server, Network, Loader2 } from "lucide-react";
import { DarkAppShell } from "@/components/layout/DarkAppShell";
import { getLabTracks, type LabTrack, type TrackLab } from "@/lib/api/tracks";
import { getModuleInfo } from "@/lib/terraform-modules";
import { useAuthStore } from "@/lib/store/auth-store";

// ─── helpers ─────────────────────────────────────────────────────────────────

function bar(filled: number, total = 16): string {
  const f = Math.min(Math.max(filled, 0), total);
  return "█".repeat(f) + "░".repeat(total - f);
}

// ─── types ────────────────────────────────────────────────────────────────────

type ActiveLab = TrackLab & { trackLabel: string };

// ─── component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuthStore();
  const [tracks, setTracks] = useState<LabTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getLabTracks().then(({ data }) => {
      setTracks(data?.tracks ?? []);
      setTracksLoading(false);
    });
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B11] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin" />
      </div>
    );
  }

  // ── derived stats ──
  const totalLabs = tracks.reduce((n, t) => n + t.labs.length, 0);
  const completedLabs = tracks.reduce(
    (n, t) => n + t.labs.filter((l) => l.progress === "completed").length,
    0
  );
  const activeLabs = tracks.reduce(
    (n, t) => n + t.labs.filter((l) => l.progress === "active").length,
    0
  );
  const activeEnvs = tracks.filter((t) => !!t.environment).length;

  const activeIncidents: ActiveLab[] = tracks.flatMap((t) => {
    const { label } = getModuleInfo(t.terraform_module);
    return t.labs
      .filter((l) => l.progress === "active")
      .map((l) => ({ ...l, trackLabel: label }));
  });

  // ── greeting ──
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName =
    user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Operator";

  // ── career bars ──
  const juniorFilled = Math.round(Math.min(completedLabs / 5, 1) * 16);
  const midFilled =
    completedLabs >= 5
      ? Math.round(Math.min((completedLabs - 5) / 10, 1) * 16)
      : 0;
  const juniorCleared = completedLabs >= 5;
  const midCleared = completedLabs >= 15;

  const skillRating =
    completedLabs >= 15 ? "L3 ENG" : completedLabs >= 5 ? "L2 ENG" : "L1 ENG";
  const elo =
    completedLabs >= 15 ? "1470 ELO" : completedLabs >= 5 ? "1200 ELO" : "800 ELO";

  return (
    <DarkAppShell>
      <div className="p-6 sm:p-8 max-w-[1600px] mx-auto w-full">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 font-sans">
            {greeting}, {firstName}.
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            What would you like to break today?
          </p>

          {/* ASCII separator */}
          <div className="mt-6 text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none">
            {"─".repeat(160)}
          </div>

          {/* Stats row */}
          <div className="flex gap-6 sm:gap-10 py-4 font-mono text-sm uppercase flex-wrap">
            <div>
              <span className="text-slate-500 block text-xs mb-1">Available Missions</span>
              <span className="text-white font-bold text-xl">
                {tracksLoading ? "—" : totalLabs}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs mb-1">Running Env</span>
              <span
                className={`font-bold text-xl flex items-center gap-2 ${
                  activeEnvs > 0 ? "text-[#EF4444]" : "text-slate-400"
                }`}
              >
                {tracksLoading ? "—" : activeEnvs}
                {activeEnvs > 0 && (
                  <Activity size={16} className="animate-pulse" />
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs mb-1">Completed</span>
              <span className="text-white font-bold text-xl">
                {tracksLoading ? "—" : completedLabs}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs mb-1">Skill Rating</span>
              <span className="text-[#38BDF8] font-bold text-xl">{skillRating}</span>
            </div>
          </div>

          <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none">
            {"─".repeat(160)}
          </div>
        </div>

        {/* ── Three-column layout ───────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Col 1: Active Labs Queue */}
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span>Active Labs</span>
              <span className="bg-[#1E293B] text-white px-2 py-0.5 rounded-sm">
                {tracksLoading ? "…" : activeLabs}
              </span>
            </div>

            {tracksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin" />
              </div>
            ) : activeIncidents.length > 0 ? (
              activeIncidents.map((lab) => (
                <Link
                  key={lab.id}
                  href={`/labs/${lab.slug}`}
                  className="bg-[#0F172A] border-l-2 border-[#EF4444] border-y border-r border-[#1E293B] p-4 hover:bg-[#1E293B]/50 transition-colors block"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-1.5 py-0.5 bg-[#EF4444]/10 text-[#EF4444] font-mono text-[10px] uppercase font-bold border border-[#EF4444]/30">
                      ACTIVE
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {lab.trackLabel}
                    </span>
                  </div>
                  <h3 className="text-white font-bold mb-3 font-sans text-sm">
                    {lab.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase">
                    <div>
                      <div className="text-slate-500 mb-0.5">Status</div>
                      <div className="text-[#F59E0B] flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> In Progress
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-0.5">Est.</div>
                      <div className="text-white">{lab.estimated_minutes} min</div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="bg-[#070B11] border border-[#1E293B] p-6 text-center">
                <div className="text-slate-500 font-mono text-xs mb-3">
                  NO ACTIVE LABS
                </div>
                <Link
                  href="/catalog"
                  className="border border-[#38BDF8] text-[#38BDF8] font-mono text-xs uppercase px-4 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors inline-block"
                >
                  Browse Catalog
                </Link>
              </div>
            )}
          </div>

          {/* Col 2: AWS Infrastructure */}
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span>AWS Infrastructure</span>
              <span
                className={`flex items-center gap-1 ${
                  activeEnvs > 0 ? "text-[#22C55E]" : "text-slate-500"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeEnvs > 0 ? "bg-[#22C55E]" : "bg-slate-600"
                  }`}
                />
                {activeEnvs > 0 ? "LIVE" : "IDLE"}
              </span>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] p-4 flex flex-col font-mono text-xs min-h-[220px]">
              <div className="flex justify-between text-slate-500 mb-4 border-b border-[#1E293B] pb-2">
                <span>Your AWS Account</span>
                <span className="text-[#38BDF8]">us-east-1</span>
              </div>

              <div className="flex-1 relative border-2 border-dashed border-[#1E293B] p-4">
                <div className="absolute -top-2.5 left-2 bg-[#0F172A] px-2 text-slate-500 text-[10px]">
                  VPC
                </div>

                <div className="flex justify-around items-center h-full min-h-[100px] pt-4 relative">
                  {/* Connecting line */}
                  <div
                    className="absolute top-1/2 left-10 right-10 h-px -z-10"
                    style={{
                      background: `linear-gradient(to right, #22C55E, ${
                        activeEnvs > 0 ? "#EF4444" : "#1E293B"
                      })`,
                    }}
                  />

                  <div className="flex flex-col items-center gap-2 z-10">
                    <div
                      className={`w-10 h-10 bg-[#070B11] border rounded flex items-center justify-center ${
                        activeEnvs > 0
                          ? "border-[#22C55E] text-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                          : "border-[#1E293B] text-slate-600"
                      }`}
                    >
                      <Network size={18} />
                    </div>
                    <span className="text-white text-[10px]">Tunnel</span>
                    <span
                      className={`text-[10px] ${
                        activeEnvs > 0 ? "text-[#22C55E]" : "text-slate-500"
                      }`}
                    >
                      {activeEnvs > 0 ? "Active" : "Idle"}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 z-10">
                    <div
                      className={`w-10 h-10 bg-[#070B11] border rounded flex items-center justify-center relative ${
                        activeEnvs > 0
                          ? "border-[#EF4444] text-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          : "border-[#1E293B] text-slate-600"
                      }`}
                    >
                      {activeEnvs > 0 && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
                      )}
                      <Server size={18} />
                    </div>
                    <span className="text-white text-[10px]">EC2-Prod</span>
                    <span
                      className={`text-[10px] ${
                        activeEnvs > 0 ? "text-[#EF4444]" : "text-slate-500"
                      }`}
                    >
                      {activeEnvs > 0 ? "Running" : "Stopped"}
                    </span>
                  </div>
                </div>
              </div>

              {activeEnvs === 0 && (
                <div className="mt-3 text-center text-slate-600 text-[10px]">
                  START A LAB TO PROVISION INFRASTRUCTURE
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Operator Stats */}
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span>Operator Stats</span>
              <span className="text-[#38BDF8]">{elo}</span>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] p-5 space-y-5 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-[#1E293B] pb-4">
                <div>
                  <div className="text-slate-500 mb-1">Labs Completed</div>
                  <div className="text-2xl font-bold text-white">
                    {tracksLoading ? "—" : completedLabs}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">In Progress</div>
                  <div className="text-2xl font-bold text-white">
                    {tracksLoading ? "—" : activeLabs}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Total Labs</div>
                  <div className="text-xl font-bold text-[#38BDF8]">
                    {tracksLoading ? "—" : totalLabs}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Completion</div>
                  <div className="text-xl font-bold text-[#22C55E]">
                    {tracksLoading || totalLabs === 0
                      ? "—"
                      : `${Math.round((completedLabs / totalLabs) * 100)}%`}
                  </div>
                </div>
              </div>

              {/* RPG Progression bars */}
              <div>
                <div className="text-slate-500 mb-3 text-[10px]">
                  CAREER_PROGRESSION
                </div>
                <div className="space-y-3 text-[10px]">
                  {/* Junior */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Junior Engineer</span>
                      <span
                        className={juniorCleared ? "text-[#22C55E]" : "text-slate-500"}
                      >
                        {juniorCleared ? "CLEARED" : `${completedLabs}/5`}
                      </span>
                    </div>
                    <div
                      className={`tracking-widest ${
                        juniorCleared ? "text-[#22C55E]" : "text-slate-600"
                      }`}
                    >
                      {juniorCleared ? bar(16) : bar(juniorFilled)}
                    </div>
                  </div>

                  {/* Mid-level */}
                  <div className={completedLabs < 5 ? "opacity-40" : ""}>
                    <div className="flex justify-between mb-1">
                      <span
                        className={
                          midCleared ? "text-[#38BDF8]" : "text-slate-400"
                        }
                      >
                        Mid-Level Engineer
                      </span>
                      <span
                        className={
                          midCleared
                            ? "text-[#38BDF8]"
                            : completedLabs >= 5
                            ? "text-[#38BDF8]"
                            : "text-slate-500"
                        }
                      >
                        {midCleared
                          ? "CLEARED"
                          : completedLabs >= 5
                          ? `${completedLabs - 5}/10`
                          : "LOCKED"}
                      </span>
                    </div>
                    <div
                      className={`tracking-widest ${
                        midCleared ? "text-[#38BDF8]" : "text-slate-600"
                      }`}
                    >
                      {midCleared
                        ? bar(16)
                        : completedLabs >= 5
                        ? bar(midFilled)
                        : bar(0)}
                    </div>
                  </div>

                  {/* Senior */}
                  <div className={completedLabs < 15 ? "opacity-20" : "opacity-60"}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Senior Engineer</span>
                      <span className="text-slate-500">
                        {completedLabs >= 15 ? `${completedLabs - 15}/∞` : "LOCKED"}
                      </span>
                    </div>
                    <div className="text-slate-700 tracking-widest">{bar(0)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DarkAppShell>
  );
}
