"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { DarkAppShell } from "@/components/layout/DarkAppShell";
import { getLabTracks, type LabTrack } from "@/lib/api/tracks";
import { getModuleInfo } from "@/lib/terraform-modules";

export default function TracksClient() {
  const [tracks, setTracks] = useState<LabTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLabTracks().then(({ data, error: apiError }) => {
      if (apiError) setError("Unable to load tracks right now. Please try again.");
      else setTracks(data?.tracks ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <DarkAppShell>
      <div className="p-6 sm:p-8 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 font-sans">
            Training Tracks
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Each track groups labs by environment. Switch between labs in the same track without reprovisioning.
          </p>
          <div className="mt-6 text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none">
            {"─".repeat(160)}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 font-mono">
            <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-8 max-w-sm w-full text-center">
              <div className="text-[#EF4444] text-[10px] uppercase tracking-widest mb-3">TRACKS_LOAD_ERROR</div>
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
        ) : tracks.length === 0 ? (
          <div className="border border-[#1E293B] border-dashed p-12 text-center">
            <p className="text-sm text-slate-500 font-mono mb-4">
              NO TRACKS FOUND. START A LAB FROM THE CATALOG TO SEE YOUR PROGRESS HERE.
            </p>
            <Link
              href="/catalog"
              className="border border-[#38BDF8] text-[#38BDF8] font-mono text-xs uppercase px-4 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors inline-block"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {tracks.map((track) => {
              const info = getModuleInfo(track.terraform_module);
              const completedCount = track.labs.filter((l) => l.progress === "completed").length;
              const totalLabs = track.labs.length;
              const progressPct =
                totalLabs > 0 ? Math.round((completedCount / totalLabs) * 100) : 0;
              const estimatedHours = Math.ceil(
                track.labs.reduce((sum, l) => sum + (l.estimated_minutes ?? 30), 0) / 60
              );
              const slug = track.terraform_module.replace("labs/", "");
              const hasActiveEnv = !!track.environment;

              return (
                <div
                  key={track.terraform_module}
                  className="bg-[#0F172A] border border-[#1E293B] hover:border-[#38BDF8] transition-all flex flex-col"
                >
                  {/* Track header */}
                  <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#070B11]">
                    <span className="font-mono text-[10px] px-2 py-0.5 border uppercase font-bold bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]">
                      {completedCount}/{totalLabs} LABS
                    </span>
                    <div className="flex items-center gap-2">
                      {hasActiveEnv && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-[#22C55E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse inline-block" />
                          ENV ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex-1 flex flex-col font-mono text-xs">
                    <h2 className="font-bold text-base text-white mb-2 font-sans">
                      {info.label}
                    </h2>
                    <p className="text-slate-500 leading-relaxed mb-5 min-h-[40px] font-sans text-xs">
                      {info.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="border border-[#1E293B] bg-[#070B11] p-3">
                        <div className="text-slate-500 text-[10px] mb-1">LABS</div>
                        <div className="font-bold text-white text-lg">{totalLabs}</div>
                      </div>
                      <div className="border border-[#1E293B] bg-[#070B11] p-3">
                        <div className="text-slate-500 text-[10px] mb-1 flex items-center gap-1">
                          <Clock size={10} /> ESTIMATE
                        </div>
                        <div className="font-bold text-white text-lg">{estimatedHours}h</div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-auto">
                      <div className="flex justify-between text-[10px] mb-1.5">
                        <span className="text-slate-500">PROGRESS</span>
                        <span className="text-[#38BDF8]">{progressPct}%</span>
                      </div>
                      <div className="w-full h-1 bg-[#1E293B] mb-5">
                        <div
                          className="h-full bg-[#38BDF8] transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <Link
                        href={`/tracks/${slug}`}
                        className="flex items-center justify-center gap-2 border border-[#38BDF8] text-[#38BDF8] text-xs font-mono uppercase px-3 py-2.5 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors tracking-widest"
                      >
                        View Labs <ChevronRight size={12} />
                      </Link>
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
