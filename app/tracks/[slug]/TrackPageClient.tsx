"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { DarkAppShell } from "@/components/layout/DarkAppShell";
import { getLabTracks, type LabTrack, type TrackLab } from "@/lib/api/tracks";
import { getModuleInfo } from "@/lib/terraform-modules";

const SEV_STYLES: Record<string, string> = {
  beginner:     "text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/5",
  intermediate: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/5",
  advanced:     "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/5",
};

function getSev(difficulty?: string) {
  const d = difficulty?.toLowerCase();
  if (d === "advanced") return "SEV-1";
  if (d === "intermediate") return "SEV-2";
  return "SEV-3";
}

export default function TrackPageClient() {
  const params = useParams();

  // Static export: Cloudflare rewrites /tracks/[real-slug] → __shell HTML.
  // useParams() returns '__shell'; parse the real slug from the browser URL instead.
  const slug = useMemo(() => {
    const fromRouter = params.slug as string;
    if (fromRouter !== "__shell") return fromRouter;
    if (typeof window === "undefined") return fromRouter;
    const match = window.location.pathname.match(/\/tracks\/([^/]+)/);
    return match?.[1] ?? fromRouter;
  }, [params.slug]);

  const [track, setTrack] = useState<LabTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLabTracks().then(({ data, error: apiError }) => {
      if (apiError) {
        setError("Unable to load this track right now. Please try again.");
      } else {
        const found = (data?.tracks ?? []).find(
          (t) => t.terraform_module === `labs/${slug}`
        );
        setTrack(found ?? null);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <DarkAppShell title="Loading…" description="">
        <div className="flex items-center justify-center py-16 gap-2">
          <div className="w-4 h-4 border-2 border-[#38BDF8]/20 border-t-[#38BDF8] rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">LOADING_TRACK...</span>
        </div>
      </DarkAppShell>
    );
  }

  if (error) {
    return (
      <DarkAppShell>
        <div className="flex flex-col items-center justify-center py-24 font-mono">
          <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-8 max-w-sm w-full text-center">
            <div className="text-[#EF4444] text-[10px] uppercase tracking-widest mb-3">TRACK_LOAD_ERROR</div>
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
      </DarkAppShell>
    );
  }

  if (!track) {
    return (
      <DarkAppShell>
        <div className="max-w-4xl mx-auto p-6 text-center py-16 font-mono">
          <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-4">TRACK_NOT_FOUND</div>
          <p className="text-sm text-slate-400 mb-6">
            This track doesn&apos;t exist or you haven&apos;t started any labs in it yet.
          </p>
          <Link
            href="/catalog"
            className="border border-[#38BDF8] text-[#38BDF8] text-xs px-4 py-2 uppercase tracking-widest hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors"
          >
            Browse Incidents
          </Link>
        </div>
      </DarkAppShell>
    );
  }

  const info = getModuleInfo(track.terraform_module);
  const completedCount = track.labs.filter((l) => l.progress === "completed").length;
  const totalLabs = track.labs.length;
  const filled = Math.round((completedCount / Math.max(totalLabs, 1)) * 16);
  const bar = "█".repeat(filled) + "░".repeat(16 - filled);

  return (
    <DarkAppShell title={info.label} description={info.description}>
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <Link
          href="/tracks"
          className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 mb-6 font-mono uppercase tracking-widest transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> All Tracks
        </Link>

        {/* Track header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-sans mb-1">{info.label}</h1>
          <p className="text-slate-400 text-sm font-sans mb-4">{info.description}</p>

          <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-4">
            {"─".repeat(160)}
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="text-slate-500">
              PROGRESS: {completedCount}/{totalLabs}
            </span>
            <span className="text-[#38BDF8] tracking-wider hidden sm:inline">[{bar}]</span>
            <span className="text-slate-500">
              {Math.round((completedCount / Math.max(totalLabs, 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* Lab list */}
        <div className="space-y-2">
          {track.labs.map((lab, i) => (
            <LabCard key={lab.id} lab={lab} index={i + 1} />
          ))}
        </div>
      </div>
    </DarkAppShell>
  );
}

function LabCard({ lab, index }: { lab: TrackLab; index: number }) {
  const isCompleted = lab.progress === "completed";
  const isActive = lab.progress === "active";
  const sevClass =
    SEV_STYLES[lab.difficulty?.toLowerCase()] ??
    "text-slate-400 border-slate-600 bg-transparent";

  return (
    <div
      className={`bg-[#0F172A] border p-4 flex items-start gap-4 transition-colors ${
        isCompleted
          ? "border-[#22C55E]/20"
          : isActive
          ? "border-[#38BDF8]/30"
          : "border-[#1E293B]"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
        ) : (
          <Circle className={`w-4 h-4 ${isActive ? "text-[#38BDF8]" : "text-slate-600"}`} />
        )}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white font-sans">
              {index}. {lab.title}
            </h3>
            {lab.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 font-sans">{lab.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`font-mono text-[10px] px-1.5 py-0.5 border uppercase tracking-widest ${sevClass}`}>
              {getSev(lab.difficulty)}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {lab.estimated_minutes}m
            </span>
          </div>
        </div>

        {lab.objectives && lab.objectives.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lab.objectives.slice(0, 3).map((obj, j) => (
              <span
                key={j}
                className="text-[10px] text-slate-500 bg-[#070B11] border border-[#1E293B] px-1.5 py-0.5 font-mono"
              >
                {obj}
              </span>
            ))}
            {lab.objectives.length > 3 && (
              <span className="text-[10px] text-slate-600 font-mono">
                +{lab.objectives.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <Link
        href={`/labs/${lab.slug}`}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
          isCompleted
            ? "border border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10"
            : "border border-[#38BDF8] text-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#070B11]"
        }`}
      >
        <PlayCircle className="w-3.5 h-3.5" />
        {isCompleted ? "Replay" : isActive ? "Continue" : "Start"}
      </Link>
    </div>
  );
}
