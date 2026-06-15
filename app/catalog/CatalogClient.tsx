"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DarkAppShell } from "@/components/layout/DarkAppShell";
import { getLabTracks } from "@/lib/api/tracks";
import type { LabTrack, TrackLab } from "@/lib/api/tracks";
import { getModuleInfo } from "@/lib/terraform-modules";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

// ─── config ──────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Linux", "Docker", "Kubernetes"] as const;
type Category = (typeof CATEGORIES)[number];

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced", "Expert"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

function getCategory(terraform_module: string): Exclude<Category, "All"> {
  if (terraform_module.includes("kubernetes")) return "Kubernetes";
  if (terraform_module.includes("docker")) return "Docker";
  return "Linux";
}

type Sev = "SEV-1" | "SEV-2" | "SEV-3";

function getSev(difficulty: string): Sev {
  const d = difficulty.toLowerCase();
  if (d === "advanced" || d === "expert") return "SEV-1";
  if (d === "intermediate") return "SEV-2";
  return "SEV-3";
}

const SEV_BADGE: Record<Sev, string> = {
  "SEV-1": "bg-[#EF4444]/10 border-[#EF4444] text-[#EF4444]",
  "SEV-2": "bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B]",
  "SEV-3": "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]",
};

// ─── types ────────────────────────────────────────────────────────────────────

type FlatLab = TrackLab & {
  category: Exclude<Category, "All">;
  sev: Sev;
  trackLabel: string;
};

// ─── component ───────────────────────────────────────────────────────────────

export default function CatalogClient() {
  const router = useRouter();
  const [tracks, setTracks] = useState<LabTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getLabTracks().then(({ data, error: apiError }) => {
      if (apiError) setError("Unable to load labs right now. Please try again.");
      else setTracks(data?.tracks ?? []);
      setLoading(false);
    });
  }, []);

  const flatLabs: FlatLab[] = tracks.flatMap((t) => {
    const category = getCategory(t.terraform_module);
    const { label } = getModuleInfo(t.terraform_module);
    return t.labs.map((l) => ({
      ...l,
      category,
      sev: getSev(l.difficulty),
      trackLabel: label,
    }));
  });

  const filtered = flatLabs.filter((l) => {
    if (activeCategory !== "All" && l.category !== activeCategory) return false;
    if (activeDifficulty !== "All" && l.difficulty.toLowerCase() !== activeDifficulty.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        l.difficulty.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalLabs = flatLabs.length;
  const completedLabs = flatLabs.filter((l) => l.progress === "completed").length;
  const hasActiveFilters = activeCategory !== "All" || activeDifficulty !== "All" || search.trim() !== "";

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveDifficulty("All");
    setSearch("");
  };

  return (
    <DarkAppShell>
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="p-6 sm:px-8 border-b border-[#1E293B] bg-[#0F172A] sticky top-0 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white font-sans">Incident Catalog</h2>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-mono text-[10px] uppercase text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
              >
                <X size={10} /> Clear filters
              </button>
            )}
            {!loading && (
              <span className="font-mono text-xs text-slate-500">
                {filtered.length}/{totalLabs} incidents
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#070B11] border border-[#1E293B] pl-8 pr-4 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 font-mono text-xs uppercase">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 border transition-colors",
                activeCategory === cat
                  ? "bg-[#38BDF8] text-[#070B11] border-[#38BDF8] font-bold"
                  : "border-[#1E293B] text-slate-400 hover:border-[#38BDF8] hover:text-[#38BDF8]"
              )}
            >
              {cat}
            </button>
          ))}
          <div className="border-l border-[#1E293B] mx-1" />
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDifficulty(d)}
              className={cn(
                "px-3 py-1.5 border transition-colors",
                activeDifficulty === d
                  ? "bg-[#22C55E] text-[#070B11] border-[#22C55E] font-bold"
                  : "border-[#1E293B] text-slate-400 hover:border-[#22C55E] hover:text-[#22C55E]"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8">
        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 font-mono">
            <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-8 max-w-sm w-full text-center">
              <div className="text-[#EF4444] text-[10px] uppercase tracking-widest mb-3">CATALOG_LOAD_ERROR</div>
              <p className="text-sm text-slate-400 mb-6">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="border border-[#38BDF8] text-[#38BDF8] text-xs px-4 py-2 uppercase tracking-widest hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-6 h-6 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Loading incidents…</p>
          </div>
        ) : error ? null : filtered.length === 0 ? (
          <div className="py-20 text-center font-mono text-xs text-slate-500 space-y-3">
            <div>NO INCIDENTS MATCH YOUR FILTERS</div>
            <button
              type="button"
              onClick={clearFilters}
              className="text-[#38BDF8] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((lab) => {
              const badgeCls = SEV_BADGE[lab.sev];
              const isCompleted = lab.progress === "completed";
              const isActive = lab.progress === "active";

              return (
                <div
                  key={lab.id}
                  className="bg-[#070B11] border border-[#1E293B] hover:border-[#38BDF8] transition-all group flex flex-col cursor-pointer relative overflow-hidden"
                  onClick={() => router.push(`/labs/${lab.slug}`)}
                >
                  {/* Hover terminal overlay */}
                  <div className="absolute inset-0 bg-[#070B11]/95 backdrop-blur-sm p-4 font-mono text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col justify-center">
                    <div className="text-[#38BDF8] mb-2">$ cat /var/log/incident.log</div>
                    <div className="text-[#EF4444] truncate mb-2">
                      CRITICAL:{" "}
                      {lab.title.toLowerCase().replace(/\s+/g, "_")}.detected
                    </div>
                    {lab.objectives && lab.objectives.length > 0 ? (
                      <ul className="space-y-1 mb-2">
                        {lab.objectives.slice(0, 4).map((obj, i) => (
                          <li key={i} className="text-slate-400 flex gap-1.5">
                            <span className="text-[#38BDF8] shrink-0">›</span>
                            <span className="line-clamp-1">{obj}</span>
                          </li>
                        ))}
                        {lab.objectives.length > 4 && (
                          <li className="text-slate-600">+{lab.objectives.length - 4} more objectives</li>
                        )}
                      </ul>
                    ) : (
                      <div className="text-slate-500 mb-2 line-clamp-2">{lab.description || "System anomaly detected. Investigate immediately."}</div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/labs/${lab.slug}`);
                      }}
                      className="mt-4 border border-[#38BDF8] text-[#38BDF8] py-2 w-full uppercase hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors font-bold tracking-widest"
                    >
                      {isCompleted
                        ? "Review Mission"
                        : isActive
                        ? "Continue Mission"
                        : "Initialize Mission"}
                    </button>
                  </div>

                  {/* Card header */}
                  <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#0F172A]">
                    <span
                      className={cn(
                        "font-mono text-[10px] px-2 py-0.5 border uppercase font-bold",
                        badgeCls
                      )}
                    >
                      {lab.sev}
                    </span>
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="font-mono text-[10px] text-[#22C55E]">
                          ✓ DONE
                        </span>
                      )}
                      {isActive && (
                        <span className="font-mono text-[10px] text-[#F59E0B] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse inline-block" />
                          ACTIVE
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-500">
                        {lab.category}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex-1 flex flex-col font-mono text-xs">
                    <h3 className="font-bold text-base text-white mb-4 font-sans">
                      {lab.title}
                    </h3>

                    <div className="space-y-2 mt-auto">
                      <div className="flex justify-between border-b border-[#1E293B] pb-1">
                        <span className="text-slate-500">Difficulty</span>
                        <span className="text-[#38BDF8] font-bold capitalize">
                          {lab.difficulty}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#1E293B] pb-1">
                        <span className="text-slate-500">Duration</span>
                        <span className="text-slate-300">{lab.estimated_minutes} min</span>
                      </div>
                      <div className="flex justify-between border-b border-[#1E293B] pb-1">
                        <span className="text-slate-500">Real Incident</span>
                        <span className="text-[#22C55E]">YES</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Track</span>
                        <span className="text-slate-400 truncate max-w-[120px] text-right">
                          {lab.trackLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DarkAppShell>
  );
}
