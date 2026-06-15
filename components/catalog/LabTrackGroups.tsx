"use client";

import { useRouter } from "next/navigation";
import {
  Terminal, Box, Layers, Server,
  Clock, CheckCircle2, ChevronRight, Zap,
} from "lucide-react";
import { getModuleInfo } from "@/lib/terraform-modules";
import type { LabTrack, TrackLab } from "@/lib/api/tracks";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Module icon mapping ────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "labs/linux-ec2": Terminal,
  "labs/docker-ec2": Box,
  "labs/kubernetes-eks": Layers,
};
function getModuleIcon(module: string) {
  return MODULE_ICONS[module] ?? Server;
}

// ─── Difficulty config ──────────────────────────────────────────────────────

type DifficultyKey = "beginner" | "intermediate" | "advanced";

const DIFFICULTY: Record<DifficultyKey, {
  label: string; hex: string;
  badgeBg: string; badgeText: string; badgeBorder: string;
}> = {
  beginner: {
    label: "Beginner", hex: "#4ade80",
    badgeBg: "bg-[#4ade80]/10", badgeText: "text-[#4ade80]", badgeBorder: "border-[#4ade80]/20",
  },
  intermediate: {
    label: "Intermediate", hex: "#fbbf24",
    badgeBg: "bg-[#fbbf24]/10", badgeText: "text-[#fbbf24]", badgeBorder: "border-[#fbbf24]/20",
  },
  advanced: {
    label: "Advanced", hex: "#f87171",
    badgeBg: "bg-[#f87171]/10", badgeText: "text-[#f87171]", badgeBorder: "border-[#f87171]/20",
  },
};

function getDiff(difficulty: string) {
  return DIFFICULTY[(difficulty.toLowerCase() as DifficultyKey)] ?? DIFFICULTY.beginner;
}

// ─── Lab Card ───────────────────────────────────────────────────────────────

function LabCard({ lab, hasActiveEnv }: { lab: TrackLab; hasActiveEnv: boolean }) {
  const router = useRouter();
  const diff = getDiff(lab.difficulty);
  const isCompleted = lab.progress === "completed";
  const isActive = lab.progress === "active";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border-[0.5px] border-l-[3px] overflow-hidden transition-all duration-200 cursor-pointer",
        "bg-[#1d2027] border-[#424754]",
        isCompleted
          ? "opacity-60 hover:opacity-80"
          : "hover:border-[#5a5f6e] hover:bg-[#202330] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      )}
      style={{ borderLeftColor: diff.hex }}
      onClick={() => router.push(`/labs/${lab.slug}`)}
    >
      {/* Card body */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Top row: progress badge + fast-start chip */}
        <div className="flex items-center justify-between gap-2 min-h-[22px]">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-full px-2.5 py-0.5">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          ) : isActive ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#adc6ff] bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] animate-pulse shrink-0" />
              In Progress
            </span>
          ) : (
            <span />
          )}

          {hasActiveEnv && !isCompleted && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4ade80] font-mono">
              <Zap className="w-3 h-3" />
              fast start
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-[#e1e2ec] leading-snug group-hover:text-white transition-colors">
          {lab.title}
        </h3>

        {/* Objectives */}
        {lab.objectives && lab.objectives.length > 0 ? (
          <ul className="space-y-1 flex-1">
            {lab.objectives.slice(0, 3).map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#8c909f] leading-snug">
                <span className="text-[#adc6ff]/50 shrink-0 mt-[3px] text-[7px]">▸</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        ) : lab.description ? (
          <p className="text-[13px] text-[#8c909f] leading-relaxed line-clamp-2 flex-1">
            {lab.description}
          </p>
        ) : null}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-md border",
              diff.badgeBg, diff.badgeText, diff.badgeBorder
            )}
          >
            {diff.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#8c909f]">
            <Clock className="w-3 h-3" />
            {lab.estimated_minutes}m
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#32353c]" />

      {/* CTA */}
      <div className="p-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); router.push(`/labs/${lab.slug}`); }}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold py-2 rounded-lg transition-all",
            isCompleted
              ? "bg-transparent border border-[#424754] text-[#8c909f] hover:border-[#5a5f6e] hover:text-[#c2c6d6]"
              : "bg-[#adc6ff] text-[#002e6a] hover:bg-[#c4d4ff] active:scale-[0.98]"
          )}
        >
          {isCompleted ? "Review" : isActive ? "Continue" : hasActiveEnv ? "Start" : "Launch"}
          {!isCompleted && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Track Section ──────────────────────────────────────────────────────────

function TrackSection({ track, difficultyFilter }: {
  track: LabTrack;
  difficultyFilter: string | null;
}) {
  const info = getModuleInfo(track.terraform_module);
  const TrackIcon = getModuleIcon(track.terraform_module);
  const env = track.environment;

  const filteredLabs = difficultyFilter
    ? track.labs.filter((l) => l.difficulty.toLowerCase() === difficultyFilter)
    : track.labs;

  if (!filteredLabs.length) return null;

  const completedCount = track.labs.filter((l) => l.progress === "completed").length;
  const totalCount = track.labs.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section>
      {/* Track header */}
      <div className="flex items-start justify-between gap-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#adc6ff]/8 border border-[#adc6ff]/15 flex items-center justify-center shrink-0 mt-0.5">
            <TrackIcon className="w-5 h-5 text-[#adc6ff]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e1e2ec] leading-tight">{info.label}</h2>
            <p className="text-[13px] text-[#8c909f] mt-1 max-w-lg leading-relaxed">{info.description}</p>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          {env ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse shrink-0" />
              Active · expires {formatDate(env.expires_at)}
            </span>
          ) : (
            <span className="text-[11px] text-[#424754] font-mono">no active environment</span>
          )}
          <span className="text-[11px] text-[#8c909f]">{completedCount}/{totalCount} completed</span>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-[3px] bg-[#272a31] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct === 100
                  ? "linear-gradient(90deg, #4ade80, #2a7f62)"
                  : "linear-gradient(90deg, #adc6ff, #7ca4f8)",
              }}
            />
          </div>
          <span className="text-[11px] font-mono text-[#8c909f] shrink-0 w-8 text-right">{pct}%</span>
        </div>
      )}

      {/* Lab cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLabs.map((lab) => (
          <LabCard key={lab.id} lab={lab} hasActiveEnv={!!env} />
        ))}
      </div>
    </section>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

interface LabTrackGroupsProps {
  tracks: LabTrack[];
  difficultyFilter?: string | null;
}

export function LabTrackGroups({ tracks, difficultyFilter = null }: LabTrackGroupsProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#1d2027] border border-[#424754] flex items-center justify-center">
          <Server className="w-6 h-6 text-[#424754]" />
        </div>
        <p className="text-[#8c909f] text-sm">No lab tracks published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {tracks.map((track) => (
        <TrackSection
          key={track.terraform_module}
          track={track}
          difficultyFilter={difficultyFilter}
        />
      ))}
    </div>
  );
}
