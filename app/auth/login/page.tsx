"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { loginUser } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { Logo } from "@/components/ui/Logo";

const INCIDENT_LOGS = [
  "nginx.service failed",
  "Disk Usage: 98%",
  "Root Cause: Unknown",
  "Status: Investigating...",
  "kubelet[1023]: Node disk pressure detected",
  "Evicting pods...",
  "kernel: Out of memory: Killed process 1452",
  "dockerd[892]: Error response from daemon: connection refused",
  "502 Bad Gateway",
  "Connection refused on port 5432",
  "WARN: CPU throttling detected on node-3",
  "etcd leader changed",
  "coredns[3312]: dial timeout — upstream unreachable",
  "Latency p99: 4200ms",
  "cert-manager: certificate expiry in 2h",
  "PVC bound failed — no available storage",
];

function isCritical(log: string) {
  return (
    log.includes("failed") ||
    log.includes("Error") ||
    log.includes("memory") ||
    log.includes("502") ||
    log.includes("refused")
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();

  const [mode, setMode] = useState<"login" | "provisioning">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [logStream, setLogStream] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setLogStream((prev) => {
        const entry = `[${new Date().toISOString().substring(11, 19)}] ${
          INCIDENT_LOGS[Math.floor(Math.random() * INCIDENT_LOGS.length)]
        }`;
        return [entry, ...prev].slice(0, 22);
      });
    }, 750);
    return () => clearInterval(id);
  }, []);

  const handleAuthenticate = async () => {
    if (!email || !password) { setError("ERR: credentials required"); return; }
    setError("");
    setMode("provisioning");
    setSequence([]);

    const steps = [
      "Authenticating operator...",
      "Checking credentials...",
      "Loading operator profile...",
      "Fetching active incident environments...",
    ];

    const startTime = Date.now();
    const animMs = steps.length * 500;
    steps.forEach((s, i) => setTimeout(() => setSequence((p) => [...p, s]), i * 500));

    const { data, error: apiError } = await loginUser(email, password);

    if (apiError || !data) {
      setTimeout(() => {
        setMode("login");
        setError(apiError?.error || "ERR: authentication failed");
      }, 400);
      return;
    }

    setToken(data.token);
    setUser(data.user);

    const remaining = Math.max(0, animMs - (Date.now() - startTime));
    setTimeout(() => {
      setSequence((p) => [...p, "✓ Authentication successful"]);
      setTimeout(() => router.push("/dashboard"), 700);
    }, remaining);
  };

  return (
    <div className="flex h-screen bg-[#070B11] text-slate-300 font-mono text-[15px] overflow-hidden">
      {/* ── Left: live incident stream ──────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 border-r border-[#1E293B] p-8 flex-col justify-start relative overflow-hidden">
        <div className="scanline opacity-[0.15]" />
        <div className="flex items-center gap-2 text-[#EF4444] text-[11px] font-bold uppercase tracking-widest mb-6">
          <Activity size={13} className="animate-pulse" />
          Incident Response Console
        </div>
        <div className="space-y-1.5">
          {logStream.map((log, i) => (
            <div
              key={i}
              className={`text-xs leading-relaxed ${
                isCritical(log) ? "text-[#EF4444]/70" : "text-slate-600"
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: login form ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center p-8 sm:p-16 relative">
        <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

        <div className="max-w-sm w-full mx-auto relative z-10">
          {/* Brand */}
          <div className="mb-12">
            <Logo />
          </div>

          {/* ── Login form ── */}
          {mode === "login" && (
            <div className="space-y-8">
              <div className="text-[#38BDF8] font-bold">$ authenticate operator</div>

              {error && (
                <div className="text-[#EF4444] text-xs">{error}</div>
              )}

              <div className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-500 text-[11px] uppercase tracking-widest">email:</label>
                  <div className="flex items-center border-b border-[#1E293B] pb-1.5 focus-within:border-[#38BDF8] transition-colors">
                    <span className="mr-2 text-[#38BDF8] text-xs">{">"}</span>
                    <input
                      type="email"
                      autoFocus
                      className="bg-transparent outline-none w-full text-white caret-[#38BDF8]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-500 text-[11px] uppercase tracking-widest">password:</label>
                  <div className="flex items-center border-b border-[#1E293B] pb-1.5 focus-within:border-[#38BDF8] transition-colors">
                    <span className="mr-2 text-[#38BDF8] text-xs">{">"}</span>
                    <input
                      type="password"
                      className="bg-transparent outline-none w-full text-white caret-[#38BDF8]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <button
                  onClick={handleAuthenticate}
                  className="border border-[#38BDF8] text-[#38BDF8] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors"
                >
                  [ $ authenticate ]
                </button>
                <Link
                  href="/auth/register"
                  className="text-slate-500 hover:text-white text-xs transition-colors underline decoration-slate-700 underline-offset-4"
                >
                  Create Profile
                </Link>
              </div>
            </div>
          )}

          {/* ── Provisioning animation ── */}
          {mode === "provisioning" && (
            <div className="space-y-2">
              {sequence.map((line, i) => (
                <div
                  key={i}
                  className={`text-sm ${line.startsWith("✓") ? "text-[#22C55E]" : "text-[#38BDF8]"}`}
                >
                  {line}
                </div>
              ))}
              {!sequence.some((l) => l.startsWith("✓")) && (
                <span className="w-2 h-[1em] bg-[#38BDF8] inline-block align-middle animate-blink" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
