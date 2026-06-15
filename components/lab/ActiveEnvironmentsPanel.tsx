"use client";

import { useEffect, useState } from "react";
import { Server, Trash2 } from "lucide-react";
import {
  getActiveEnvironments,
  endEnvironment,
  type LabEnvironment,
} from "@/lib/api/environments";
import { formatDate } from "@/lib/utils";

export function ActiveEnvironmentsPanel() {
  const [environments, setEnvironments] = useState<LabEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await getActiveEnvironments();
    if (res.error) { setError(res.error.error); }
    else { setEnvironments(res.data?.environments ?? []); setError(""); }
    setLoading(false);
  }

  async function handleEnd(envId: string) {
    setEnding(envId);
    const res = await endEnvironment(envId);
    if (res.error) { setError(res.error.error); }
    else { await load(); }
    setEnding(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-[#38BDF8]/20 border-t-[#38BDF8] rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">LOADING_ENVIRONMENTS...</span>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className="bg-[#070B11] border border-[#1E293B] p-4 font-mono text-xs">
        <div className="text-slate-500">$ list-environments --active</div>
        <div className="text-slate-600 mt-1">→ No active environments found.</div>
        <div className="text-slate-600">Start a lab to provision real AWS infrastructure.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-[#EF4444] font-mono">ERR: {error}</p>
      )}
      {environments.map((env) => (
        <div
          key={env.id}
          className="flex items-center justify-between gap-4 border border-[#1E293B] bg-[#0F172A] p-4"
        >
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-4 w-4 text-[#22C55E] shrink-0" />
            <div className="font-mono">
              <p className="text-xs font-bold text-white">{env.terraform_module}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Expires {formatDate(env.expires_at)} · scenario: {env.current_scenario ?? "none"}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={ending === env.id}
            onClick={() => handleEnd(env.id)}
            className="flex items-center gap-1.5 border border-[#EF4444]/40 px-3 py-1.5 text-[10px] font-mono text-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-50 uppercase tracking-widest transition-colors shrink-0"
          >
            <Trash2 className="h-3 w-3" />
            {ending === env.id ? "ENDING..." : "END_ENV"}
          </button>
        </div>
      ))}
    </div>
  );
}
