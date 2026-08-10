"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LabPlayer from "@/components/lab/LabPlayer";
import { getLabBySlug } from "@/lib/api/labs";
import type { Lab } from "@/lib/api/labs";
import { startLab, getLabStatus, recoverLabSession } from "@/lib/api/provisioning";
import { endEnvironment } from "@/lib/api/environments";

type LabConflictError = {
  error?: string;
  existingLabSlug?: string;
  existingLabTitle?: string;
};

export default function LabPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [lab, setLab] = useState<Lab | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [provisionMode, setProvisionMode] = useState<"full_provision" | "scenario_switch">("full_provision");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [websocketUrl, setWebsocketUrl] = useState<string | null>(null);
  const [sshHostname, setSshHostname] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "provisioning" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [endingEnv, setEndingEnv] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  const pollSessionStatus = useCallback((sessionIdToPoll: string) => {
    console.log("⏳ Starting to poll session status for:", sessionIdToPoll.slice(0, 8));
    let pollCount = 0;
    const maxPollAttempts = provisionMode === "scenario_switch" ? 60 : 600;

    const poll = async () => {
      const { data, error: statusError } = await getLabStatus(sessionIdToPoll);
      if (statusError) {
        // Handle session expiry
        if (statusError.status === 410) {
          setError("Your session has expired. Please start a new lab.");
          setStatus("error");
          localStorage.removeItem(`lab-session-${slug}`);
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
      if (data.terraform_module) {
        // Status includes the environment module, but this page currently renders lab metadata.
      }

      if (data.status === "active") {
        console.log("✅ Poll complete - Lab status is ACTIVE for session:", sessionIdToPoll.slice(0, 8));
        // Extract terminal connection info from status response
        if (data.terminalUrl) setWebsocketUrl(data.terminalUrl);
        if (data.tunnel_hostname) setSshHostname(data.tunnel_hostname);
        setStatus("ready");
        setLoadingProgress(100);
        return;
      }

      if (data.status === "destroyed" || data.statusCode === "SESSION_EXPIRED") {
        console.error("❌ Session has expired:", data.status);
        setError("Your session has expired. Please start a new lab.");
        setStatus("error");
        localStorage.removeItem(`lab-session-${slug}`);
        return;
      }

      if (data.status === "provisioning" || data.status === "scenario_switching") {
        pollCount++;
        setLoadingProgress(Math.min((pollCount / maxPollAttempts) * 100, 95));
        setProgressMessage(
          data.status === "scenario_switching"
            ? "Switching lab scenario on your environment…"
            : "Provisioning infrastructure in your AWS account…"
        );
        if (pollCount < maxPollAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError("Setup timed out. Please try again.");
          setStatus("error");
        }
        return;
      }

      if (data.status === "failed") {
        console.error("❌ Lab setup failed with status:", data.status);
        setError(`Lab setup failed: ${data.status}`);
        setStatus("error");
      }
    };

    poll();
  }, [provisionMode, slug]);

  // Session recovery on mount: check localStorage and backend for active session
  useEffect(() => {
    async function recoverSession() {
      // First try localStorage for quick restoration
      const storedSessionId = localStorage.getItem(`lab-session-${slug}`);
      if (storedSessionId) {
        console.log("📋 Found session in localStorage:", storedSessionId.slice(0, 8));
        setSessionId(storedSessionId);
        setStatus("provisioning");
        // Poll to check if still active (will check expiry)
        setTimeout(() => pollSessionStatus(storedSessionId), 100);
        return;
      }

      // If not in localStorage, check backend for recovery
      console.log("🔄 Checking backend for active session...");
      const { data, error } = await recoverLabSession(slug);
      if (error) {
        // Handle various error types
        if (error.status === 410) {
          console.log("⏰ Session has expired");
          setError("Your session has expired. Please start a new lab.");
          setStatus("error");
        } else {
          console.log("ℹ️ No active session to recover");
        }
        return;
      }

      if (!data) {
        console.log("ℹ️ No active session to recover");
        return;
      }

      console.log("✅ Recovered session from backend:", data.sessionId.slice(0, 8));
      // Restore session state
      setSessionId(data.sessionId);
      setEnvironmentId(data.environmentId);
      setProvisionMode(data.mode);
      setExpiresAt(data.expiresAt);
      setSessionStartedAt(data.createdAt || null);
      setWebsocketUrl(data.websocketUrl);
      setSshHostname(data.sshHostname || null);
      
      // Store in localStorage for next time
      localStorage.setItem(`lab-session-${slug}`, data.sessionId);

      // Determine appropriate status based on backend session status
      if (data.status === "active") {
        setStatus("ready");
        setLoadingProgress(100);
      } else {
        setStatus("provisioning");
        setProgressMessage("Resuming lab setup...");
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
    setStatus("provisioning");
    setError(null);
    setLoadingProgress(5);
    
    console.log("🎬 Starting lab...");

    const { data, error: startError } = await startLab(slug);
    if (startError) {
      // Handle multi-lab conflict error (409)
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

    console.log("📊 Lab started response:", {
      sessionId: data.sessionId.slice(0, 8),
      environmentId: data.environmentId.slice(0, 8),
      websocketUrl: data.websocketUrl,
      sshHostname: data.sshHostname,
      mode: data.mode
    });

    // Store session ID in localStorage for recovery on page refresh
    localStorage.setItem(`lab-session-${slug}`, data.sessionId);

    setSessionId(data.sessionId);
    setEnvironmentId(data.environmentId);
    setProvisionMode(data.mode);
    setExpiresAt(data.expiresAt);
    setSessionStartedAt(data.createdAt || new Date().toISOString());
    setWebsocketUrl(data.websocketUrl);
    setSshHostname(data.sshHostname || null);
    setProgressMessage(
      data.mode === "scenario_switch"
        ? "Reusing your active environment…"
        : "Connecting to your AWS account…"
    );
    pollSessionStatus(data.sessionId);
  };

  const handleEndEnvironment = async () => {
    if (!environmentId) return;
    setEndingEnv(true);
    
    // Clear session from localStorage when ending
    localStorage.removeItem(`lab-session-${slug}`);
    
    await endEnvironment(environmentId);
    setEndingEnv(false);
    router.push("/catalog");
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#10131a]">
      {status === "ready" && sessionId && websocketUrl && (
        <div className="w-full h-full">
          {/* Render the actual lab player with terminal, objectives, validation, etc. */}
          <LabPlayer 
            labSlug={slug}
            lab={lab}
            sessionId={sessionId || undefined}
            websocketUrl={websocketUrl || undefined}
            environmentId={environmentId || undefined}
            sshHostname={sshHostname || undefined}
            expiresAt={expiresAt || undefined}
            sessionStartedAt={sessionStartedAt || undefined}
            onEndEnvironment={environmentId ? handleEndEnvironment : undefined}
            endingEnvironment={endingEnv}
          />
        </div>
      )}

      {status !== "ready" && (
        <div className="w-screen h-screen flex items-center justify-center bg-[#10131a]">
          <div className="w-full max-w-md mx-auto px-6">
            {status === "error" && error && (
              <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg p-6 text-center">
                <h2 className="text-lg font-semibold text-[#ffb4ab] mb-2">Lab Setup Failed</h2>
                <p className="text-sm text-[#c2c6d6] mb-4">{error}</p>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setError(null);
                  }}
                  className="bg-[#adc6ff] text-[#002e6a] text-sm font-semibold px-4 py-2 rounded"
                >
                  Try Again
                </button>
              </div>
            )}

            {status === "idle" && !error && lab && (
              <div className="bg-[#1d2027] border border-[#424754] rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-[#e1e2ec] mb-2">{lab.title}</h2>
                <p className="text-sm text-[#c2c6d6] mb-4">{lab.description}</p>
                <p className="text-xs text-[#8c909f] mb-6 font-mono">{lab.terraform_module}</p>
                <button
                  onClick={handleStartLab}
                  className="w-full bg-[#adc6ff] text-[#002e6a] text-sm font-semibold py-3 rounded"
                >
                  Start Lab
                </button>
              </div>
            )}

            {status === "provisioning" && (
              <div className="bg-[#1d2027] border border-[#424754] rounded-lg p-8 text-center">
                <h2 className="text-xl font-bold text-[#e1e2ec] mb-2">Setting Up Your Lab</h2>
                <p className="text-sm text-[#c2c6d6] mb-6">{progressMessage}</p>
                <div className="w-full bg-[#32353c] rounded-full h-2 mb-4">
                  <div
                    className="bg-[#adc6ff] h-2 rounded-full transition-all"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[#8c909f]">{Math.round(loadingProgress)}%</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
