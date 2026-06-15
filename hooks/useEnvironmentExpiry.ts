"use client";

import { useEffect, useMemo, useState } from "react";

export type ExpiryWarningLevel = "none" | "info" | "warning" | "critical";

export interface EnvironmentExpiryState {
  remainingMs: number;
  remainingLabel: string;
  warningLevel: ExpiryWarningLevel;
  warningMessage: string | null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Countdown + warnings at 4h, 1h, and 10m before environment expiry.
 */
export function useEnvironmentExpiry(expiresAt: string | null | undefined): EnvironmentExpiryState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return useMemo(() => {
    if (!expiresAt) {
      return {
        remainingMs: 0,
        remainingLabel: "—",
        warningLevel: "none" as const,
        warningMessage: null,
      };
    }

    const end = new Date(expiresAt).getTime();
    const remainingMs = Math.max(0, end - now);
    const remainingLabel = formatRemaining(remainingMs);

    const fourHours = 4 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const tenMin = 10 * 60 * 1000;

    let warningLevel: ExpiryWarningLevel = "none";
    let warningMessage: string | null = null;

    if (remainingMs === 0) {
      warningLevel = "critical";
      warningMessage = "Your lab environment has expired. Start a new lab to continue.";
    } else if (remainingMs <= tenMin) {
      warningLevel = "critical";
      warningMessage = `Environment expires in ${remainingLabel} — save your work now.`;
    } else if (remainingMs <= oneHour) {
      warningLevel = "warning";
      warningMessage = `Environment expires in ${remainingLabel}.`;
    } else if (remainingMs <= fourHours) {
      warningLevel = "info";
      warningMessage = `Shared environment expires in ${remainingLabel}.`;
    }

    return { remainingMs, remainingLabel, warningLevel, warningMessage };
  }, [expiresAt, now]);
}
