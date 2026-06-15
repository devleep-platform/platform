"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TerminalPanel } from "./TerminalPanel";
import {
  Clock,
  Power,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  Circle,
  XCircle,
  Info,
  CheckSquare,
  HelpCircle,
  PlayCircle,
  Cloud,
  Server,
  Loader2,
  Shield,
  Archive,
  FileText,
  ArrowLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useLabStore } from "@/lib/store/lab-store";
import { useAuthStore } from "@/lib/store/auth-store";
import type { ValidationResult } from "@/lib/types";
import type { Lab } from "@/lib/api/labs";
import { stopLabSession, runValidation } from "@/lib/api/provisioning";

interface LabPlayerProps {
  labSlug: string;
  lab?: Lab | null;
  sessionId?: string | null;
  websocketUrl?: string | null;
  environmentId?: string | null;
  sshHostname?: string | null;
  expiresAt?: string | null;
  sessionStartedAt?: string | null;
  sessionTimeoutAt?: string | null;
  onEndEnvironment?: () => void | Promise<void>;
  endingEnvironment?: boolean;
  pageStatus?: "idle" | "provisioning" | "ready" | "error";
  progressMessage?: string;
  loadingProgress?: number;
  provisioningEvents?: Array<{ type: string; message: string; timestamp: number }>;
  onStartLab?: () => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: "bg-[#1e3a2f] text-[#4ade80] border border-[#2a7f62]/40",
  intermediate: "bg-[#2d2a0f] text-[#fbbf24] border border-[#d97706]/40",
  advanced: "bg-[#2d1a0f] text-[#fb923c] border border-[#ea580c]/40",
  expert: "bg-[#2d0f1a] text-[#f87171] border border-[#dc2626]/40",
};

function getSev(difficulty?: string | null): string {
  const d = (difficulty || "").toLowerCase();
  if (d === "advanced" || d === "expert") return "SEV-1";
  if (d === "intermediate") return "SEV-2";
  return "SEV-3";
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  ssh_command: "SSH",
  http_get: "HTTP",
  process: "Process",
  file_exists: "File",
  k8s_resource: "K8s",
  aws_api: "AWS",
};

const formatDuration = (totalSeconds: number | null) => {
  if (totalSeconds === null) return "--:--:--";
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
};

const parseExpiryTime = (value?: string | null) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
};

function formatCheckId(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Converts 2-space indented blocks in hint text (raw YAML |) into fenced code blocks
// so InstructionContent can render them properly instead of treating them as prose.
function preprocessHintText(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("  ") && line.trim().length > 0) {
      out.push("```bash");
      while (i < lines.length && (lines[i].startsWith("  ") || lines[i].trim() === "")) {
        out.push(lines[i].startsWith("  ") ? lines[i].slice(2) : "");
        i++;
      }
      while (out.length > 0 && out[out.length - 1] === "") out.pop();
      out.push("```");
    } else {
      out.push(line);
      i++;
    }
  }
  return out.join("\n");
}

// Renders inline markdown: `code`, **bold**, *italic*
function InlineMarkdown({ text }: { text: string }): React.ReactElement {
  const INLINE_RE = /`([^`\n]+)`|\*\*(.+?)\*\*|\*([^*\n]+)\*/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <code key={m.index} className="bg-[#070B11] text-[#38BDF8] font-mono px-1.5 py-0.5 text-[12px] border border-[#1E293B] whitespace-nowrap">
          {m[1]}
        </code>
      );
    } else if (m[2] !== undefined) {
      nodes.push(<strong key={m.index} className="font-semibold text-[#e1e2ec]">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={m.index} className="italic">{m[3]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

// Line-by-line markdown block renderer: headings, lists, paragraphs
function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) { i++; continue; }

    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      blocks.push(
        <div
          key={key++}
          className={
            level === 1
              ? "text-[15px] font-semibold text-[#e1e2ec] mt-5 mb-2 first:mt-0"
              : level === 2
                ? "text-sm font-semibold text-[#e1e2ec] mt-4 mb-1.5 first:mt-0"
                : "text-[13px] font-medium text-[#adc6ff] mt-3 mb-1 first:mt-0"
          }
        >
          <InlineMarkdown text={hMatch[2]} />
        </div>
      );
      i++;
      continue;
    }

    if (/^[-*+] /.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i].trim())) {
        const raw = lines[i].trim().replace(/^[-*+] /, "");
        const content = /^'(.*)'$/.test(raw)
          ? raw.slice(1, -1).replace(/''/g, "'")
          : raw;
        items.push(
          <li key={i} className="flex gap-2.5 items-start">
            <span className="text-[#adc6ff] shrink-0 mt-[6px] text-[7px]">▸</span>
            <span className="text-sm text-[#c2c6d6] leading-relaxed">
              <InlineMarkdown text={content} />
            </span>
          </li>
        );
        i++;
      }
      blocks.push(<ul key={key++} className="mb-3 space-y-1.5">{items}</ul>);
      continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        const hit = lines[i].trim().match(/^(\d+)[.)]\s(.*)/);
        items.push(
          <li key={i} className="flex gap-3 items-start">
            <span className="font-mono text-[12px] text-[#adc6ff] shrink-0 min-w-[1.25rem] pt-px">
              {hit?.[1] ?? items.length + 1}.
            </span>
            <span className="text-sm text-[#c2c6d6] leading-relaxed">
              <InlineMarkdown text={hit?.[2] ?? lines[i].trim()} />
            </span>
          </li>
        );
        i++;
      }
      blocks.push(<ol key={key++} className="mb-3 space-y-1.5">{items}</ol>);
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().match(/^#{1,3}\s/) &&
      !/^[-*+] /.test(lines[i].trim()) &&
      !/^\d+[.)]\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length) {
      const COMMAND_PREFIXES = [
        "$ ", "sudo ", "grep ", "cat ", "ls ", "cd ", "mkdir ", "rm ", "cp ",
        "mv ", "chmod ", "chown ", "systemctl ", "journalctl ", "curl ", "wget ",
        "docker ", "kubectl ", "apt ", "apt-get ", "pip ", "pip3 ", "npm ",
        "yarn ", "git ", "echo ", "export ", "source ", "which ", "find ", "ps ",
        "kill ", "sed ", "awk ", "head ", "tail ", "tar ", "unzip ", "ssh ",
        "scp ", "nc ", "nmap ", "ping ", "dig ", "nslookup ", "service ",
      ];
      const isCommandLine = (line: string) =>
        COMMAND_PREFIXES.some((p) => line.startsWith(p)) ||
        (line.includes("|") && /^[a-z]/.test(line) && !/[.!?]$/.test(line)) ||
        (/^[a-z]/.test(line) && /\s-{1,2}[a-zA-Z]/.test(line) && !/[.!?]$/.test(line) && line.length < 120);

      let proseBatch: string[] = [];
      const flushProse = () => {
        if (!proseBatch.length) return;
        blocks.push(
          <p key={key++} className="mb-3 last:mb-0 text-sm text-[#c2c6d6] leading-[1.75]">
            {proseBatch.map((line, li) => (
              <span key={li}>
                <InlineMarkdown text={line} />
                {li < proseBatch.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
        proseBatch = [];
      };

      for (const line of paraLines) {
        if (isCommandLine(line)) {
          flushProse();
          const cmd = line.startsWith("$ ") ? line.slice(2) : line;
          blocks.push(
            <div key={key++} className="my-2.5 border border-[#1E293B] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F172A] border-b border-[#1E293B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]/40 shrink-0" />
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">bash</span>
              </div>
              <pre className="bg-[#070B11] px-4 py-3 text-[12px] font-mono text-[#38BDF8] whitespace-pre-wrap break-words leading-relaxed">
                <span className="text-slate-600 select-none">$ </span>{cmd}
              </pre>
            </div>
          );
        } else {
          proseBatch.push(line);
        }
      }
      flushProse();
    }
  }

  return <>{blocks}</>;
}

// Top-level renderer: splits on fenced code blocks, passes prose to MarkdownBlock
function InstructionContent({ text }: { text: string }) {
  const fenced = /```(\w*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fenced.exec(text)) !== null) {
    const prose = text.slice(last, m.index);
    if (prose.trim()) parts.push(<MarkdownBlock key={`t${last}`} text={prose} />);
    const lang = m[1] || "bash";
    const code = m[2].trim();
    parts.push(
      <div key={`c${m.index}`} className="border border-[#1E293B] overflow-hidden my-4">
        <div className="flex items-center justify-between px-4 py-2 bg-[#0F172A] border-b border-[#1E293B]">
          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest">{lang}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(code)}
            className="text-[11px] text-slate-500 hover:text-[#38BDF8] transition-colors font-mono"
          >
            copy
          </button>
        </div>
        <pre className="bg-[#070B11] px-5 py-4 text-[12.5px] font-mono text-slate-300 whitespace-pre-wrap break-words leading-[1.65]">
          {code}
        </pre>
      </div>
    );
    last = m.index + m[0].length;
  }
  const tail = text.slice(last);
  if (tail.trim()) parts.push(<MarkdownBlock key={`t${last}`} text={tail} />);
  return <>{parts}</>;
}

export default function LabPlayer({
  labSlug,
  lab: propLab,
  sessionId,
  websocketUrl,
  expiresAt,
  sessionStartedAt,
  sessionTimeoutAt,
  pageStatus,
  progressMessage,
  loadingProgress,
  provisioningEvents,
  onStartLab,
}: LabPlayerProps) {
  const router = useRouter();
  const { token } = useAuthStore();
  const { instance, lab: storeLab, loading, error, endLab, initializeLab } = useLabStore();

  const lab = propLab || storeLab;

  const [fallbackStartedAtMs] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [labEnded, setLabEnded] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['briefing', 'evidence', 'objectives', 'deliverables']);
  const [openEvidenceItems, setOpenEvidenceItems] = useState<Set<number>>(() => new Set());
  const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(false);
  const [activityTimeline] = useState<{ time: string; text: string }[]>(() => [
    { time: new Date().toLocaleTimeString('en-US', { hour12: false }), text: "Lab Session Started" }
  ]);
  const [liveTimeline, setLiveTimeline] = useState(activityTimeline);
  const [expandedHints, setExpandedHints] = useState<Set<number>>(() => new Set([1]));
  const [isEndingLab, setIsEndingLab] = useState(false);
  const [endLabError, setEndLabError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationQueued, setValidationQueued] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev =>
      prev.includes(panel) ? prev.filter(p => p !== panel) : [...prev, panel]
    );
  };

  const toggleHint = (level: number) => {
    setExpandedHints((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const addActivity = (text: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLiveTimeline(prev => [...prev, { time, text }]);
  };

  useEffect(() => {
    if (!token) { router.push("/auth/login"); return; }
    if (propLab) return;
    if (sessionId && websocketUrl) return;
    initializeLab(labSlug, token).catch(() => {});
  }, [labSlug, token, initializeLab, router, sessionId, websocketUrl, propLab]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const environmentExpiryMs = parseExpiryTime(expiresAt);

  const sessionExpiryMs = (() => {
    if (sessionTimeoutAt) return parseExpiryTime(sessionTimeoutAt);
    const ttlSeconds = instance?.ttlSeconds || (lab?.timeout_minutes ? lab.timeout_minutes * 60 : 0);
    if (!ttlSeconds) return null;
    const startMs =
      parseExpiryTime(sessionStartedAt) ??
      (instance?.startedAt ? new Date(instance.startedAt).getTime() : null) ??
      fallbackStartedAtMs;
    return startMs + ttlSeconds * 1000;
  })();

  const sessionRemainingSeconds = labEnded
    ? 0
    : sessionExpiryMs
      ? Math.max(0, Math.floor((sessionExpiryMs - nowMs) / 1000))
      : null;

  const environmentRemainingSeconds =
    environmentExpiryMs === null
      ? null
      : Math.max(0, Math.floor((environmentExpiryMs - nowMs) / 1000));

  const handleEndLab = async () => {
    if (isEndingLab) return;
    setIsEndingLab(true);
    setEndLabError(null);
    try {
      if (sessionId) {
        await stopLabSession(sessionId);
      } else if (token) {
        await endLab(token);
      }
      localStorage.removeItem(`lab-session-${labSlug}`);
      setLabEnded(true);
      router.push("/catalog");
    } catch (err) {
      setEndLabError(err instanceof Error ? err.message : "Failed to end lab");
    } finally {
      setIsEndingLab(false);
    }
  };

  const hasActiveSession = !!(sessionId || instance?.id);
  const isSessionReady = pageStatus === "ready" || (pageStatus !== "idle" && hasActiveSession);

  const handleRunValidation = async () => {
    if (isValidating) return;
    if (!hasActiveSession) {
      setValidationError("No active session — start the lab first.");
      setIsBottomDrawerOpen(true);
      return;
    }
    const sid = sessionId || instance?.id!;
    setIsValidating(true);
    setValidationError(null);
    setValidationQueued(false);
    setIsBottomDrawerOpen(true);
    addActivity("Validation Run Triggered");
    try {
      const { error: apiError } = await runValidation(sid);
      if (apiError) throw new Error(apiError.error);
      setValidationQueued(true);
      addActivity("Validation Queued — awaiting results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to queue validation";
      setValidationError(msg);
      addActivity(`Validation Error: ${msg}`);
    } finally {
      setIsValidating(false);
    }
  };

  const allValidationResults: ValidationResult[] = instance?.validationResults?.length
    ? instance.validationResults
    : [];

  const validationChecks = lab?.content?.validation?.checks || [];

  if (loading && !sessionId) {
    return (
      <div className="min-h-screen bg-[#070B11] flex items-center justify-center text-white font-mono text-xs">
        <div className="text-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Setting up your lab environment...</p>
        </div>
      </div>
    );
  }

  if (error && !sessionId) {
    return (
      <div className="min-h-screen bg-[#070B11] flex items-center justify-center text-white font-mono">
        <div className="bg-[#0F172A] border border-[#1E293B] p-8 max-w-md w-full mx-4">
          <AlertCircle className="w-10 h-10 text-[#EF4444] mb-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Lab Setup Failed</h2>
          <p className="text-slate-400 text-xs mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="border border-[#38BDF8] text-[#38BDF8] text-xs uppercase px-4 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors tracking-widest"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!instance && !lab && !sessionId) {
    return (
      <div className="min-h-screen bg-[#070B11] flex items-center justify-center text-white font-mono">
        <div className="bg-[#0F172A] border border-[#1E293B] p-8 max-w-md w-full mx-4">
          <AlertCircle className="w-10 h-10 text-[#EF4444] mb-4" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-2">Lab Not Found</h2>
          <p className="text-slate-400 text-xs mb-6">Lab data could not be loaded</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="border border-[#38BDF8] text-[#38BDF8] text-xs uppercase px-4 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors tracking-widest"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#070B11] text-white font-sans">

      {/* INCIDENT HEADER */}
      <div className="h-14 bg-[#0F172A] border-b border-[#1E293B] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back to catalog — does NOT end the lab */}
          <button
            onClick={() => router.push("/catalog")}
            className="shrink-0 flex items-center gap-1.5 text-slate-500 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-colors pr-3 border-r border-[#1E293B]"
            title="Back to catalog (lab keeps running)"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Catalog</span>
          </button>

          {lab?.difficulty && (
            <span className="bg-[#F59E0B]/10 border border-[#F59E0B] text-[#F59E0B] font-mono text-[10px] px-2 py-0.5 uppercase font-bold tracking-widest hidden sm:inline-block shrink-0">
              {getSev(lab.difficulty)} INCIDENT
            </span>
          )}
          <h2 className="text-white font-bold font-sans text-sm truncate">{lab?.title || "Loading…"}</h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-slate-400 mr-2">
            <span className="flex items-center gap-1.5">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSessionReady ? "bg-[#22C55E] animate-pulse" : "bg-slate-600"
              )} />
              {isSessionReady
                ? (lab?.content?.environment?.instance_type || "t3.micro")
                : "No session"}
            </span>
            {isSessionReady && sessionRemainingSeconds !== null && (
              <span className="border-l border-[#1E293B] pl-3 flex items-center gap-1.5">
                <Clock size={10} />
                {formatDuration(sessionRemainingSeconds)}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              if (!expandedPanels.includes('hints')) togglePanel('hints');
              setTimeout(() => document.getElementById('hints-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }}
            className="hidden sm:flex border border-[#1E293B] text-slate-400 px-3 py-1.5 font-mono text-[10px] uppercase font-bold hover:bg-[#1E293B] hover:text-white transition-colors gap-1.5 items-center"
          >
            <HelpCircle size={12} /> Hints
          </button>

          <button
            onClick={handleRunValidation}
            disabled={isValidating || !isSessionReady}
            title={!isSessionReady ? "Start the lab first" : "Run validation checks"}
            className="bg-[#22C55E] text-[#070B11] px-4 py-1.5 font-mono text-[10px] uppercase font-bold hover:bg-[#16A34A] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
          >
            {isValidating
              ? <><Loader2 size={12} className="animate-spin" /> Running…</>
              : <><PlayCircle size={12} /> Validate</>
            }
          </button>

          {pageStatus !== "idle" && (
            <button
              onClick={handleEndLab}
              disabled={isEndingLab}
              className="px-3 py-1.5 border border-[#EF4444]/50 text-[#EF4444] text-[10px] font-mono uppercase hover:bg-[#EF4444]/10 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest"
              type="button"
            >
              <Power className="w-3 h-3" />
              {isEndingLab ? "Ending…" : "End Lab"}
            </button>
          )}
        </div>
      </div>

      {endLabError && (
        <div className="shrink-0 border-b border-[#EF4444]/30 bg-[#EF4444]/10 px-6 py-2 text-xs text-[#EF4444] font-mono">
          {endLabError}
        </div>
      )}

      <main className="flex flex-1 min-h-0">

        {/* LEFT PANEL: Accordions */}
        <div className="w-[35%] min-w-[320px] max-w-[500px] bg-[#070B11] border-r border-[#1E293B] flex flex-col overflow-y-auto shrink-0 shadow-[4px_0_15px_rgba(0,0,0,0.3)] custom-scrollbar">

          {/* Accordion: Briefing */}
          <div className="border-b border-[#1E293B]">
            <button
              onClick={() => togglePanel('briefing')}
              className="w-full flex items-center justify-between p-3 bg-[#0F172A] hover:bg-[#1E293B]/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest transition-colors"
            >
              <span className="flex items-center gap-2">
                <Info size={14} className="text-[#38BDF8]" /> Briefing
              </span>
              {expandedPanels.includes('briefing') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedPanels.includes('briefing') && (
              <div className="p-4 bg-[#070B11] font-mono text-[11px] text-slate-300 leading-relaxed">
                {lab?.content?.briefing?.narrative
                  ? <MarkdownBlock text={lab.content.briefing.narrative} />
                  : lab?.description
                    ? <MarkdownBlock text={lab.description} />
                    : <span className="text-slate-500 italic">No briefing available.</span>
                }
              </div>
            )}
          </div>

          {/* Accordion: Evidence */}
          {lab?.content?.evidence && lab.content.evidence.length > 0 && (
            <div className="border-b border-[#1E293B]">
              <button
                onClick={() => togglePanel('evidence')}
                className="w-full flex items-center justify-between p-3 bg-[#0F172A] hover:bg-[#1E293B]/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Shield size={14} className="text-[#F59E0B]" /> Evidence
                </span>
                {expandedPanels.includes('evidence') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedPanels.includes('evidence') && (
                <div className="p-4 bg-[#070B11] space-y-2">
                  {lab.content.evidence.map((ev, i) => (
                    <div key={i}>
                      <button
                        onClick={() => setOpenEvidenceItems(prev => {
                          const next = new Set(prev);
                          next.has(i) ? next.delete(i) : next.add(i);
                          return next;
                        })}
                        className="w-full text-left bg-[#1E293B]/30 hover:bg-[#1E293B] border border-[#1E293B] p-3 transition-colors flex items-center justify-between group"
                      >
                        <span className="font-mono text-[11px] text-slate-300 group-hover:text-white flex items-center gap-2">
                          <FileText size={13} className="text-[#F59E0B] shrink-0" />
                          {ev.title || `Evidence ${i + 1}`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {openEvidenceItems.has(i) ? 'Collapse' : 'Click to open'}
                        </span>
                      </button>
                      {openEvidenceItems.has(i) && (
                        <div className="p-3 bg-[#000] border border-t-0 border-[#1E293B] font-mono text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                          {ev.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Accordion: Objectives */}
          {lab?.content?.objectives && lab.content.objectives.length > 0 && (
            <div className="border-b border-[#1E293B]">
              <button
                onClick={() => togglePanel('objectives')}
                className="w-full flex items-center justify-between p-3 bg-[#0F172A] hover:bg-[#1E293B]/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckSquare size={14} className="text-[#22C55E]" /> Objectives
                </span>
                {expandedPanels.includes('objectives') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedPanels.includes('objectives') && (
                <div className="p-4 bg-[#070B11] font-mono text-[11px] space-y-3">
                  {lab.content.objectives.map((obj, i) => {
                    const passed = allValidationResults.length > 0 &&
                      allValidationResults.every(r => r.status === 'passed');
                    return (
                      <div key={i} className="flex items-start gap-3">
                        {passed
                          ? <CheckCircle2 size={14} className="text-[#22C55E] shrink-0 mt-0.5" />
                          : <Circle size={14} className="text-slate-600 shrink-0 mt-0.5" />
                        }
                        <span className={passed ? 'text-slate-400 line-through' : 'text-slate-300'}>
                          {obj}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Accordion: Deliverables */}
          {lab?.content?.deliverables && lab.content.deliverables.length > 0 && (
            <div className="border-b border-[#1E293B]">
              <button
                onClick={() => togglePanel('deliverables')}
                className="w-full flex items-center justify-between p-3 bg-[#0F172A] hover:bg-[#1E293B]/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Archive size={14} className="text-[#38BDF8]" /> Deliverables
                </span>
                {expandedPanels.includes('deliverables') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedPanels.includes('deliverables') && (
                <div className="p-4 bg-[#070B11] font-mono text-[11px] space-y-4">
                  {lab.content.deliverables.map((d, i) => {
                    const allPassed = allValidationResults.length > 0 &&
                      allValidationResults.every(r => r.status === 'passed');
                    const anyFailed = allValidationResults.some(r => r.status === 'failed');
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-2">
                          <span className="text-[#38BDF8] truncate mr-2 font-mono text-[11px]">{d.path}</span>
                          <span className={cn(
                            "shrink-0 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider",
                            allPassed
                              ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50"
                              : anyFailed
                                ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/50"
                                : "bg-[#1E293B] text-slate-400 border border-[#1E293B]"
                          )}>
                            {allPassed ? 'Complete' : anyFailed ? 'Incomplete' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-slate-500 pl-2 leading-relaxed whitespace-pre-line text-[10px]">
                          {d.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Accordion: Hints */}
          {lab?.content?.hints && lab.content.hints.length > 0 && (
            <div className="border-b border-[#1E293B]" id="hints-panel">
              <button
                onClick={() => togglePanel('hints')}
                className="w-full flex items-center justify-between p-3 bg-[#0F172A] hover:bg-[#1E293B]/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-[#F59E0B]" /> Hints
                </span>
                {expandedPanels.includes('hints') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedPanels.includes('hints') && (
                <div className="p-4 bg-[#070B11] space-y-4">
                  {lab.content.hints.map((hint) => {
                    const isExpanded = expandedHints.has(hint.level);
                    const borderColor = hint.level === 3 ? 'border-[#EF4444]' : hint.level === 2 ? 'border-[#F59E0B]' : 'border-[#1E293B]';
                    const labelColor = hint.level === 3 ? 'text-[#EF4444]' : hint.level === 2 ? 'text-[#F59E0B]' : 'text-slate-500';
                    const bgColor = hint.level === 3 ? 'bg-[#EF4444]/10' : hint.level === 2 ? 'bg-[#F59E0B]/10' : 'bg-[#1E293B]/30';
                    return (
                      <div key={hint.level}>
                        <div className={cn("font-mono text-[10px] uppercase mb-2", labelColor)}>
                          Hint Level {hint.level}
                          {hint.level === 3 && <span className="ml-2 opacity-60">(spoilers)</span>}
                        </div>
                        {isExpanded ? (
                          <div className={cn("p-3 border-l-2 text-[11px] text-slate-300 leading-relaxed", bgColor, borderColor)}>
                            <InstructionContent text={preprocessHintText(hint.text)} />
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleHint(hint.level)}
                            className="w-full py-2 border border-[#1E293B] border-dashed text-slate-500 hover:text-white hover:border-slate-500 transition-colors font-mono text-[10px] uppercase tracking-widest"
                          >
                            Reveal Level {hint.level}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT PANEL: Env bar + Terminal + Bottom Drawer */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#070B11]">

          {/* Environment Status Bar */}
          <div className="h-10 bg-[#0F172A] border-b border-[#1E293B] flex items-center px-4 font-mono text-[10px] text-slate-400 justify-between shrink-0">
            <div className="flex items-center gap-6">
              <span className="text-[#38BDF8] font-bold uppercase hidden sm:inline-block">AWS Environment</span>
              <span className="flex items-center gap-1.5"><Server size={12} /> {lab?.content?.environment?.instance_type || "t3.micro"}</span>
              <span className="flex items-center gap-1.5"><Cloud size={12} /> us-east-1</span>
            </div>
            <div className="flex items-center gap-4">
              {environmentRemainingSeconds !== null && (
                <span className="hidden lg:inline text-slate-500">
                  Env: <span className="text-white font-mono">{formatDuration(environmentRemainingSeconds)}</span>
                </span>
              )}
              <span className="text-[#22C55E] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" /> Running
              </span>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            <TerminalPanel
              sessionId={sessionId || instance?.id}
              status={instance?.status || "active"}
              terminalUrl={websocketUrl || undefined}
              pageStatus={pageStatus}
              progressMessage={progressMessage}
              loadingProgress={loadingProgress}
              provisioningEvents={provisioningEvents}
              onStartLab={onStartLab}
            />
          </div>

          {/* Bottom Drawer: Activity & Validation */}
          <div
            className={cn(
              "shrink-0 border-t border-[#1E293B] bg-[#0F172A] transition-all duration-300 overflow-hidden",
              isBottomDrawerOpen ? "h-64" : "h-10"
            )}
          >
            <button
              onClick={() => setIsBottomDrawerOpen(!isBottomDrawerOpen)}
              className="w-full h-10 flex items-center justify-between px-4 text-slate-400 hover:text-white hover:bg-[#1E293B]/50 transition-colors font-mono text-[10px] uppercase font-bold tracking-widest"
            >
              <div className="flex items-center gap-2">
                <Clock size={14} /> Activity & Validation
              </div>
              {isBottomDrawerOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {isBottomDrawerOpen && (
              <div className="p-4 h-[calc(100%-40px)] overflow-y-auto flex gap-4 custom-scrollbar">

                {/* Activity Timeline */}
                <div className="flex-1 border-r border-[#1E293B] pr-4">
                  <div className="font-mono text-[10px] text-slate-500 uppercase mb-3">Activity Log</div>
                  <div className="space-y-2 font-mono">
                    {liveTimeline.map((event, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-slate-500 text-xs shrink-0">{event.time}</span>
                        <span className={cn(
                          "text-xs",
                          event.text.includes('Error') ? 'text-[#EF4444]'
                            : event.text.includes('Triggered') ? 'text-[#F59E0B]'
                              : 'text-slate-300'
                        )}>
                          {event.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Results */}
                <div className="flex-1">
                  <div className="font-mono text-[10px] text-slate-500 uppercase mb-3">Validation Results</div>
                  {validationChecks.length === 0 ? (
                    <div className="text-xs text-slate-500 font-mono italic">No validation checks configured.</div>
                  ) : allValidationResults.length === 0 && !isValidating && !validationQueued ? (
                    <div className="text-xs text-slate-500 font-mono italic">No validation runs yet.</div>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {validationChecks.map((check) => {
                        const result = allValidationResults.find(
                          (r) => r.id === check.id || r.objectiveId === check.id
                        );
                        const passed = result?.status === "passed";
                        const failed = result?.status === "failed";
                        return (
                          <div key={check.id} className="flex flex-col gap-0.5 border-b border-[#1E293B]/50 pb-2 mb-2">
                            <div className="flex items-center gap-3">
                              {passed && <span className="text-[#22C55E] w-12 font-bold shrink-0">[PASS]</span>}
                              {failed && <span className="text-[#EF4444] w-12 font-bold shrink-0">[FAIL]</span>}
                              {!result && <span className="text-slate-600 w-12 font-bold shrink-0">[----]</span>}
                              <span className={failed ? "text-[#EF4444]" : "text-slate-300"}>
                                {formatCheckId(check.id)}
                              </span>
                            </div>
                            {failed && check.failure_hint && (
                              <div className="ml-[60px] text-slate-500 text-[10px] italic">
                                {check.failure_hint}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isValidating && (
                        <div className="text-slate-500 flex items-center gap-2 mt-2">
                          <Loader2 size={12} className="animate-spin" /> Executing checks...
                        </div>
                      )}
                      {validationQueued && allValidationResults.length === 0 && !isValidating && (
                        <div className="text-[#38BDF8] mt-2">Queued — results incoming…</div>
                      )}
                      {validationError && (
                        <div className="text-[#EF4444] mt-2">ERR: {validationError}</div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
