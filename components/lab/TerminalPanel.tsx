"use client";

import { useEffect, useRef, useState } from "react";
import type { LabStatus } from "@/lib/types";
import { useAuthStore } from "@/lib/store/auth-store";

function toHttpTerminalUrl(wsUrl: string): string {
  return wsUrl
    .replace(/^wss?:\/\//, "https://")
    .replace(/\/ws\/?$/, "");
}

export function TerminalPanel({
  sessionId,
  status,
  terminalUrl: terminalUrlProp,
  pageStatus,
  progressMessage,
  loadingProgress,
  provisioningEvents,
  onStartLab,
}: {
  sessionId?: string;
  status: LabStatus;
  terminalUrl?: string;
  pageStatus?: "idle" | "provisioning" | "ready" | "error";
  progressMessage?: string;
  loadingProgress?: number;
  provisioningEvents?: Array<{ type: string; message: string; timestamp: number }>;
  onStartLab?: () => void;
}) {
  const { token } = useAuthStore();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(true);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;

    if (terminalUrlProp) {
      setResolvedUrl(toHttpTerminalUrl(terminalUrlProp));
      setIsProvisioning(false);
      return;
    }

    if (!sessionId) return;

    let retryTimeout: NodeJS.Timeout | null = null;

    const fetchSession = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/labs/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch session");

        const session = await response.json();

        if (!session.terminalUrl) {
          if (!disposedRef.current)
            retryTimeout = setTimeout(fetchSession, 3000);
          return;
        }

        if (!disposedRef.current) {
          setResolvedUrl(toHttpTerminalUrl(session.terminalUrl));
          setIsProvisioning(false);
        }
      } catch {
        if (!disposedRef.current)
          retryTimeout = setTimeout(fetchSession, 3000);
      }
    };

    fetchSession();

    return () => {
      disposedRef.current = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [sessionId, token, terminalUrlProp]);

  // ── Idle: no session started ──────────────────────────────────────────────
  if (pageStatus === "idle") {
    return (
      <div className="h-full w-full bg-[#070B11] flex flex-col">
        {/* Terminal tab bar */}
        <div className="h-10 border-b border-[#1E293B] bg-[#0F172A] flex items-center px-4 font-mono text-xs text-slate-400 gap-4 shrink-0">
          <span className="text-white border-b-2 border-[#38BDF8] py-2.5">Terminal 1</span>
        </div>

        {/* Idle content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm text-center font-mono">
            {/* Fake terminal prompt */}
            <div className="bg-[#0F172A] border border-[#1E293B] p-5 text-left mb-6">
              <div className="text-slate-500 text-xs mb-2">
                $ ssh ubuntu@incident-lab.devleep.com
              </div>
              <div className="text-[#EF4444] text-xs font-bold animate-pulse mb-1">
                ALERT
              </div>
              <div className="text-slate-300 text-xs">Production incident detected.</div>
              <div className="text-slate-300 text-xs">Provision your environment to begin.</div>
              <div className="mt-3 text-[#38BDF8] text-xs">
                root@devleep:~#
                <span className="w-2 h-3.5 bg-[#38BDF8] inline-block align-middle ml-1 animate-blink" />
              </div>
            </div>

            <button
              onClick={onStartLab}
              className="w-full border border-[#38BDF8] text-[#38BDF8] font-mono text-sm font-bold py-3 uppercase tracking-widest hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors"
            >
              $ launch lab
            </button>
            <p className="text-slate-600 text-[10px] mt-3">
              ~90s to boot · runs in your AWS account
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Provisioning ──────────────────────────────────────────────────────────
  if (pageStatus === "provisioning") {
    return (
      <div className="h-full w-full bg-[#070B11] flex flex-col">
        {/* Terminal tab bar */}
        <div className="h-10 border-b border-[#1E293B] bg-[#0F172A] flex items-center px-4 font-mono text-xs text-slate-400 gap-4 shrink-0">
          <span className="text-white border-b-2 border-[#38BDF8] py-2.5">Terminal 1</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="font-mono w-full max-w-sm">
            {/* Live event log */}
            <div className="bg-[#0A0E17] border border-[#1E293B] text-xs mb-5 overflow-hidden">
              <div className="border-b border-[#1E293B] px-3 py-1.5 flex items-center gap-2 bg-[#0F172A]">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse inline-block" />
                <span className="text-slate-500 text-[10px] uppercase tracking-widest">Provisioning</span>
              </div>
              <div className="p-3 space-y-1.5 min-h-[120px]">
                {(!provisioningEvents || provisioningEvents.length === 0) ? (
                  <div className="text-slate-600 animate-pulse">Connecting to worker...</div>
                ) : (
                  provisioningEvents.map((event, i) => {
                    const isLast = i === provisioningEvents.length - 1;
                    const color =
                      event.type === "complete" ? "text-[#22C55E]" :
                      event.type === "error"    ? "text-[#EF4444]" :
                      event.type === "warning"  ? "text-[#F59E0B]" :
                      isLast                    ? "text-[#38BDF8]" :
                                                  "text-slate-500";
                    const prefix =
                      event.type === "complete" ? "✓ " :
                      event.type === "error"    ? "✗ " :
                      event.type === "warning"  ? "! " :
                                                  "  ";
                    return (
                      <div key={i} className={color}>
                        {prefix}{event.message}
                      </div>
                    );
                  })
                )}
                {provisioningEvents && provisioningEvents.length > 0 &&
                  !provisioningEvents.some(e => e.type === "complete" || e.type === "error") && (
                  <div className="text-slate-600 animate-pulse">_</div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {loadingProgress !== undefined && loadingProgress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                  <span className="uppercase tracking-widest">Progress</span>
                  <span className="text-[#38BDF8]">{Math.round(loadingProgress)}%</span>
                </div>
                <div className="w-full h-px bg-[#1E293B] overflow-hidden">
                  <div
                    className="h-full bg-[#38BDF8] transition-all duration-700"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-slate-600 text-[10px] text-center">this typically takes 60–90 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready: show terminal iframe ───────────────────────────────────────────
  return (
    <div className="h-full w-full bg-[#070B11] flex flex-col relative">
      {/* Terminal tab bar */}
      <div className="h-10 border-b border-[#1E293B] bg-[#0F172A] flex items-center px-4 font-mono text-xs text-slate-400 gap-4 shrink-0">
        <span className="text-white border-b-2 border-[#38BDF8] py-2.5">Terminal 1</span>
      </div>

      {isProvisioning ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center font-mono">
            <div className="w-6 h-6 border-2 border-[#38BDF8]/20 border-t-[#38BDF8] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-xs">Connecting to terminal...</p>
          </div>
        </div>
      ) : (
        <iframe
          src={resolvedUrl!}
          className="flex-1 w-full h-full border-0"
          title="DevLeap Lab Terminal"
          allow="clipboard-read; clipboard-write"
        />
      )}
    </div>
  );
}
