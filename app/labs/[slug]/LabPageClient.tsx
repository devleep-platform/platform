"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LabPlayer from "@/components/lab/LabPlayer";
import { getLabBySlug } from "@/lib/api/labs";
import type { Lab } from "@/lib/api/labs";
import { startLab, getLabStatus, recoverLabSession } from "@/lib/api/provisioning";
import { endEnvironment } from "@/lib/api/environments";
import { useAuthStore } from "@/lib/store/auth-store";
import { useLabStore } from "@/lib/store/lab-store";

type LabConflictError = {
  error?: string;
  existingLabSlug?: string;
  existingLabTitle?: string;
};

export default function LabPageClient() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Static export: Cloudflare rewrites /labs/[real-slug] → __shell HTML.
  // useParams() returns '__shell'; parse the real slug from the browser URL instead.
  const slug = useMemo(() => {
    const fromRouter = params.slug as string;
    if (fromRouter !== "__shell") return fromRouter;
    if (typeof window === "undefined") return fromRouter;
    const match = window.location.pathname.match(/\/labs\/([^/]+)/);
    return match?.[1] ?? fromRouter;
  }, [params.slug]);

  const [lab, setLab] = useState<Lab | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [provisionMode, setProvisionMode] = useState<"full_provision" | "scenario_switch">("full_provision");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionTimeoutAt, setSessionTimeoutAt] = useState<string | null>(null);
  const [websocketUrl, setWebsocketUrl] = useState<string | null>(null);
  const [doUrl, setDoUrl] = useState<string | null>(null); // DO base URL — never overwritten by terminal URL
  const [sshHostname, setSshHostname] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "provisioning" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [endingEnv, setEndingEnv] = useState(false);
  const [provisioningEvents, setProvisioningEvents] = useState<
    Array<{ type: string; message: string; timestamp: number }>
  >([]);

  // Derived from real WebSocket events — no fake poll-count math
  const loadingProgress = useMemo(() => {
    if (status === "ready") return 100;
    if (provisioningEvents.some((e) => e.type === "complete")) return 100;
    const steps = provisioningEvents.filter((e) => e.type === "progress").length;
    const expectedSteps = provisionMode === "scenario_switch" ? 4 : 9;
    return Math.max(5, Math.min(10 + (steps / expectedSteps) * 85, 92));
  }, [status, provisioningEvents, provisionMode]);

  const progressMessage = useMemo(() => {
    const last = [...provisioningEvents]
      .reverse()
      .find((e) => e.type === "progress" || e.type === "complete");
    return (
      last?.message ??
      (provisionMode === "scenario_switch"
        ? "Reusing your active environment…"
        : "Connecting to your AWS account…")
    );
  }, [provisioningEvents, provisionMode]);

  // Stable ref so the WS callback always calls the latest pollSessionStatus
  const pollRef = useRef<(id: string) => void>(() => {});

  const pollSessionStatus = useCallback((sessionIdToPoll: string) => {
    let pollCount = 0;
    const maxPollAttempts = provisionMode === "scenario_switch" ? 60 : 600;

    const poll = async () => {
      const { data, error: statusError } = await getLabStatus(sessionIdToPoll);
      if (statusError) {
        if (statusError.status === 410) {
          setError("Your session has expired. Please start a new lab.");
          setStatus("error");
          localStorage.removeItem(`lab-session-${slug}`);
          localStorage.removeItem(`lab-do-url-${slug}`);
          return;
        }
        pollCount++;
        if (pollCount < maxPollAttempts) setTimeout(poll, 1000);
        return;
      }

      if (!data) {
        pollCount++;
        if (pollCount < maxPollAttempts) setTimeout(poll, 1000);
        return;
      }

      if (data.expires_at) setExpiresAt(data.expires_at);
      if (data.created_at) setSessionStartedAt(data.created_at);
      if (data.timeout_at) setSessionTimeoutAt(data.timeout_at);

      if (data.status === "active") {
        if (data.terminalUrl) setWebsocketUrl(data.terminalUrl);
        if (data.tunnel_hostname) setSshHostname(data.tunnel_hostname);
        if (data.websocketUrl) {
          setDoUrl(data.websocketUrl);
          localStorage.setItem(`lab-do-url-${slug}`, data.websocketUrl);
        }
        setStatus("ready");
        return;
      }

      if (data.status === "destroyed" || data.statusCode === "SESSION_EXPIRED") {
        setError("Your session has expired. Please start a new lab.");
        setStatus("error");
        localStorage.removeItem(`lab-session-${slug}`);
        localStorage.removeItem(`lab-do-url-${slug}`);
        return;
      }

      if (data.status === "provisioning" || data.status === "scenario_switching") {
        pollCount++;
        if (pollCount < maxPollAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError("Setup timed out. Please try again.");
          setStatus("error");
        }
        return;
      }

      if (data.status === "failed") {
        setError("Lab setup failed. Please try again.");
        setStatus("error");
      }
    };

    poll();
  }, [provisionMode, slug]);

  // Keep ref in sync so the WebSocket handler always has the current callback
  useEffect(() => {
    pollRef.current = pollSessionStatus;
  }, [pollSessionStatus]);

  // Connect to Durable Object WebSocket during provisioning and while the lab is ready.
  // The DO replays stored events on connect, so page refreshes work.
  useEffect(() => {
    if ((status !== "provisioning" && status !== "ready") || !sessionId || !doUrl) return;

    // doUrl is the DO HTTP base URL; convert to wss and append /ws/{sessionId}
    const wsUrl = doUrl.replace(/^https?/, "wss") + "/ws/" + sessionId;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return; // polling is the fallback
    }

    const isProvisioning = status === "provisioning";

    ws.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data);
        const { type, message, timestamp, details } = event;
        if (type === "progress" || type === "complete" || type === "error" || type === "warning") {
          if (isProvisioning) {
            setProvisioningEvents((prev) => [
              ...prev,
              { type, message, timestamp: timestamp ?? Date.now() },
            ]);
          }
          if (type === "complete") {
            if (details?.results && Array.isArray(details.results)) {
              // Validation complete — transform shape to match frontend ValidationResult type
              const mapped = details.results.map((r: any) => ({
                id: r.checkId,
                objectiveId: r.checkId,
                label: r.message,
                status: r.status === "pass" ? "passed" : r.status === "fail" ? "failed" : "pending",
                message: r.message,
              }));
              useLabStore.getState().updateValidationResults(mapped);
            } else if (isProvisioning) {
              // Provisioning complete — poll to pick up terminalUrl and transition to ready
              pollRef.current(sessionId);
            }
          }
        }
      } catch {}
    };

    ws.onerror = () => {}; // silent — polling handles fallback

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [status, sessionId, doUrl]);

  useEffect(() => {
    async function recoverSession() {
      const storedSessionId = localStorage.getItem(`lab-session-${slug}`);
      if (storedSessionId) {
        setSessionId(storedSessionId);
        const storedDoUrl = localStorage.getItem(`lab-do-url-${slug}`);
        if (storedDoUrl) setDoUrl(storedDoUrl);
        const { data: quickStatus, error: quickErr } = await getLabStatus(storedSessionId);
        if (quickErr?.status === 410 || quickStatus?.status === "destroyed") {
          localStorage.removeItem(`lab-session-${slug}`);
          localStorage.removeItem(`lab-do-url-${slug}`);
          return;
        }
        if (quickStatus?.status === "active") {
          if (quickStatus.terminalUrl) setWebsocketUrl(quickStatus.terminalUrl);
          if (quickStatus.tunnel_hostname) setSshHostname(quickStatus.tunnel_hostname);
          if (quickStatus.websocketUrl) {
            setDoUrl(quickStatus.websocketUrl);
            localStorage.setItem(`lab-do-url-${slug}`, quickStatus.websocketUrl);
          }
          setStatus("ready");
        } else {
          setStatus("provisioning");
          pollSessionStatus(storedSessionId);
        }
        return;
      }

      const { data, error } = await recoverLabSession(slug);
      if (error) {
        if (error.status === 410) {
          setError("Your session has expired. Please start a new lab.");
          setStatus("error");
        }
        return;
      }

      if (!data) return;

      setSessionId(data.sessionId);
      setEnvironmentId(data.environmentId);
      setProvisionMode(data.mode);
      setExpiresAt(data.expiresAt);
      setSessionStartedAt(data.createdAt || null);
      setSessionTimeoutAt(data.timeoutAt || null);
      setWebsocketUrl(data.terminalUrl || data.websocketUrl);
      if (data.websocketUrl) setDoUrl(data.websocketUrl);
      setSshHostname(data.sshHostname || null);

      localStorage.setItem(`lab-session-${slug}`, data.sessionId);
      if (data.websocketUrl) localStorage.setItem(`lab-do-url-${slug}`, data.websocketUrl);

      if (data.status === "active") {
        setStatus("ready");
      } else {
        setStatus("provisioning");
        pollSessionStatus(data.sessionId);
      }
    }

    recoverSession();
  }, [slug, pollSessionStatus]);

  useEffect(() => {
    async function fetchLab() {
      const { data, error: apiError } = await getLabBySlug(slug);
      if (apiError) {
        setError(apiError.error || "Failed to load lab");
        setStatus("error");
        return;
      }
      if (data?.lab) {
        setLab(data.lab);
      }
    }
    fetchLab();
  }, [slug]);

  const handleStartLab = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=/labs/${slug}`);
      return;
    }
    setStatus("provisioning");
    setError(null);
    setProvisioningEvents([]);

    const { data, error: startError } = await startLab(slug);
    if (startError) {
      if (startError.status === 409) {
        const conflictData = startError.data as LabConflictError;
        const conflictMessage = conflictData.error || "A lab is already running.";
        setError(
          conflictData.existingLabSlug
            ? `${conflictMessage} Go back to continue with: ${conflictData.existingLabTitle || "the active lab"}`
            : conflictMessage
        );
      } else {
        setError(startError.error || "Failed to start lab");
      }
      setStatus("error");
      return;
    }

    if (!data) {
      setError("Failed to start lab");
      setStatus("error");
      return;
    }

    localStorage.setItem(`lab-session-${slug}`, data.sessionId);
    localStorage.setItem(`lab-do-url-${slug}`, data.websocketUrl);

    setSessionId(data.sessionId);
    setEnvironmentId(data.environmentId);
    setProvisionMode(data.mode);
    setExpiresAt(data.expiresAt);
    setSessionStartedAt(data.createdAt || new Date().toISOString());
    setSessionTimeoutAt(data.timeoutAt || null);
    setWebsocketUrl(data.websocketUrl);
    setDoUrl(data.websocketUrl);
    setSshHostname(data.sshHostname || null);
    pollSessionStatus(data.sessionId);
  };

  const handleEndEnvironment = async () => {
    if (!environmentId) return;
    setEndingEnv(true);
    localStorage.removeItem(`lab-session-${slug}`);
    localStorage.removeItem(`lab-do-url-${slug}`);
    await endEnvironment(environmentId);
    setEndingEnv(false);
    router.push("/catalog");
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#10131a]">
      {/* Error overlay */}
      {status === "error" && error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#10131a]">
          <div className="w-full max-w-md mx-auto px-6">
            <div className="bg-[#1d2027] border border-[#ffb4ab]/30 rounded-lg p-8 text-center">
              <h2 className="text-lg font-semibold text-[#ffb4ab] mb-2">Lab Setup Failed</h2>
              <p className="text-sm text-[#c2c6d6] mb-4">{error}</p>
              <button
                onClick={() => { setStatus("idle"); setError(null); }}
                className="bg-[#adc6ff] text-[#002e6a] text-sm font-semibold px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal spinner while lab metadata loads */}
      {!lab && status !== "error" && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[#adc6ff]/20 border-t-[#adc6ff] animate-spin" />
        </div>
      )}

      {/* LabPlayer shown as soon as lab data is available */}
      {lab && (
        <LabPlayer
          labSlug={slug}
          lab={lab}
          sessionId={sessionId || undefined}
          websocketUrl={websocketUrl || undefined}
          environmentId={environmentId || undefined}
          sshHostname={sshHostname || undefined}
          expiresAt={expiresAt || undefined}
          sessionStartedAt={sessionStartedAt || undefined}
          sessionTimeoutAt={sessionTimeoutAt || undefined}
          onEndEnvironment={environmentId ? handleEndEnvironment : undefined}
          endingEnvironment={endingEnv}
          pageStatus={status}
          progressMessage={progressMessage}
          loadingProgress={loadingProgress}
          provisioningEvents={provisioningEvents}
          onStartLab={handleStartLab}
        />
      )}
    </div>
  );
}
