"use client";

import { AlertTriangle, Clock, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnvironmentExpiryState } from "@/hooks/useEnvironmentExpiry";

interface EnvironmentExpiryBannerProps {
  terraformModule: string;
  mode?: "full_provision" | "scenario_switch";
  expiry: EnvironmentExpiryState;
  onEndEnvironment?: () => void;
  ending?: boolean;
}

export function EnvironmentExpiryBanner({
  terraformModule,
  mode,
  expiry,
  onEndEnvironment,
  ending,
}: EnvironmentExpiryBannerProps) {
  const moduleLabel = terraformModule.replace("labs/", "").replace(/-/g, " ");

  return (
    <div className="border-b border-[#424754] bg-[#191b23] px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs">
        <Server className="h-4 w-4 text-[#adc6ff]" aria-hidden />
        <span className="text-[#c2c6d6]">
          <span className="text-[#e1e2ec] font-medium capitalize">{moduleLabel}</span>
          {mode === "scenario_switch" ? (
            <span className="ml-2 text-[#32a852]">· fast switch</span>
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[#adc6ff] border border-[#424754] rounded px-2 py-0.5">
          <Clock className="h-3 w-3" />
          {expiry.remainingLabel} left
        </span>
      </div>

      {expiry.warningMessage ? (
        <div
          className={cn(
            "flex items-center gap-2 text-xs rounded px-2 py-1",
            expiry.warningLevel === "critical" && "bg-[#ffb4ab]/15 text-[#ffb4ab]",
            expiry.warningLevel === "warning" && "bg-[#ffb786]/15 text-[#ffb786]",
            expiry.warningLevel === "info" && "bg-[#304671]/30 text-[#b1c6f9]"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {expiry.warningMessage}
        </div>
      ) : null}

      {onEndEnvironment ? (
        <button
          type="button"
          onClick={onEndEnvironment}
          disabled={ending}
          className="text-xs border border-[#424754] text-[#c2c6d6] px-3 py-1 rounded hover:bg-[#272a31] disabled:opacity-50"
        >
          {ending ? "Ending…" : "End environment"}
        </button>
      ) : null}
    </div>
  );
}
