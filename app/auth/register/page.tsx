"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { registerUser } from "@/lib/api/auth";
import { verifyAwsRole, getAwsConnectSetup } from "@/lib/api/aws";
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

const EXPERIENCE_LEVELS = ["Student", "DevOps Engineer", "Platform Engineer", "SRE"];
const CLOUD_PROVIDERS = ["AWS", "Azure", "GCP"];

function isCritical(log: string) {
  return (
    log.includes("failed") ||
    log.includes("Error") ||
    log.includes("memory") ||
    log.includes("502") ||
    log.includes("refused")
  );
}

type Mode = "signup" | "provisioning" | "aws-connect";

export default function RegisterPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();

  const [mode, setMode] = useState<Mode>("signup");

  // Signup fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [experience, setExperience] = useState("");
  const [cloud, setCloud] = useState("AWS");
  const [error, setError] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);

  // AWS connect fields
  const [roleArn, setRoleArn] = useState("");
  const [awsError, setAwsError] = useState("");
  const [awsSequence, setAwsSequence] = useState<string[]>([]);
  const [externalId, setExternalId] = useState<string | null>(null);

  // Initialize aws_integrations record and fetch externalId when entering aws-connect step
  useEffect(() => {
    if (mode !== "aws-connect") return;
    getAwsConnectSetup().then(({ data }) => {
      if (data?.externalId) setExternalId(data.externalId);
    }).catch(() => {});
  }, [mode]);

  // Left panel log stream
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

  const handleRegister = async () => {
    if (!email || !password || !name) { setError("ERR: email, name and password required"); return; }
    if (password.length < 8) { setError("ERR: password must be at least 8 characters"); return; }
    setError("");
    setMode("provisioning");
    setSequence([]);

    const steps = [
      "Provisioning Operator Workspace...",
      "allocating namespaces...",
      "██████░░░░░░░░░░░ 30%",
      "████████████░░░░░ 75%",
      "█████████████████ 100%",
    ];

    const startTime = Date.now();
    const animMs = steps.length * 450;
    steps.forEach((s, i) => setTimeout(() => setSequence((p) => [...p, s]), i * 450));

    const { data, error: apiError } = await registerUser(email, password, name);

    if (apiError || !data) {
      setTimeout(() => {
        setMode("signup");
        const msg = apiError?.error;
        setError(
          msg?.includes("already exists")
            ? "ERR: email already registered"
            : msg || "ERR: registration failed"
        );
      }, 500);
      return;
    }

    setToken(data.token);
    setUser(data.user);

    const remaining = Math.max(0, animMs - (Date.now() - startTime));
    setTimeout(() => {
      setSequence((p) => [...p, "✓ Workspace Created."]);
      setTimeout(() => setMode("aws-connect"), 900);
    }, remaining);
  };

  const handleAwsConnect = async () => {
    if (!roleArn.trim()) { setAwsError("ERR: Role ARN required"); return; }
    setAwsError("");
    setAwsSequence(["$ devleep aws connect"]);

    const steps = [
      "Validating trust policy...",
      "Checking permissions...",
      "Verifying EC2 access...",
      "Verifying VPC access...",
      "Verifying IAM role...",
    ];

    const startTime = Date.now();
    const animMs = steps.length * 500;
    steps.forEach((s, i) => setTimeout(() => setAwsSequence((p) => [...p, s]), i * 500));

    const { error: verifyError } = await verifyAwsRole(roleArn);

    const remaining = Math.max(0, animMs - (Date.now() - startTime));

    if (verifyError) {
      setTimeout(() => {
        setAwsSequence([]);
        setAwsError(verifyError.error || "ERR: AWS verification failed");
      }, remaining);
      return;
    }

    setTimeout(() => {
      setAwsSequence((p) => [...p, "✓ AWS account connected"]);
      setTimeout(() => router.push("/dashboard"), 900);
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

      {/* ── Right: form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center p-8 sm:p-16 relative overflow-y-auto">
        <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

        <div className="max-w-sm w-full mx-auto relative z-10">
          {/* Brand */}
          <div className="mb-10">
            <Logo />
          </div>

          {/* ── Signup form ── */}
          {mode === "signup" && (
            <div className="space-y-6">
              <div className="text-[#38BDF8] font-bold">$ initialize-operator</div>

              {error && <div className="text-[#EF4444] text-xs">{error}</div>}

              <div className="space-y-5">
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
                  <label className="text-slate-500 text-[11px] uppercase tracking-widest">name:</label>
                  <div className="flex items-center border-b border-[#1E293B] pb-1.5 focus-within:border-[#38BDF8] transition-colors">
                    <span className="mr-2 text-[#38BDF8] text-xs">{">"}</span>
                    <input
                      type="text"
                      className="bg-transparent outline-none w-full text-white caret-[#38BDF8]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                    />
                  </div>
                </div>
              </div>

              {/* Experience level */}
              <div>
                <div className="text-slate-500 text-[11px] uppercase tracking-widest mb-2">
                  select experience level:
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperience(experience === lvl ? "" : lvl)}
                      className="flex items-center gap-2 text-left hover:text-white transition-colors"
                    >
                      <span className="text-[#38BDF8] font-mono">
                        [{experience === lvl ? "x" : " "}]
                      </span>
                      <span className={experience === lvl ? "text-white" : "text-slate-500"}>
                        {lvl}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloud preference */}
              <div>
                <div className="text-slate-500 text-[11px] uppercase tracking-widest mb-2">
                  preferred cloud:
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-5 text-xs">
                  {CLOUD_PROVIDERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCloud(c)}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <span className="text-[#38BDF8] font-mono">
                        [{cloud === c ? "x" : " "}]
                      </span>
                      <span className={cloud === c ? "text-white" : "text-slate-500"}>{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <button
                  onClick={handleRegister}
                  className="border border-[#22C55E] text-[#22C55E] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#22C55E] hover:text-[#070B11] transition-colors"
                >
                  [ $ provision-workspace ]
                </button>
                <Link
                  href="/auth/login"
                  className="text-slate-500 hover:text-white text-xs transition-colors underline decoration-slate-700 underline-offset-4"
                >
                  Back to login
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
                  className={`text-sm ${
                    line.startsWith("✓")
                      ? "text-[#22C55E]"
                      : line.includes("100%")
                      ? "text-[#22C55E]"
                      : line.includes("%")
                      ? "text-[#38BDF8]"
                      : "text-[#38BDF8]"
                  }`}
                >
                  {line}
                </div>
              ))}
              {!sequence.some((l) => l.startsWith("✓")) && (
                <span className="w-2 h-[1em] bg-[#38BDF8] inline-block align-middle animate-blink" />
              )}
            </div>
          )}

          {/* ── AWS connect ── */}
          {mode === "aws-connect" && (
            <div className="space-y-6">
              <div className="text-[#F59E0B] font-bold">$ devleep aws connect</div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Workspace created. Create an IAM role in your AWS account with the
                external ID below in its trust policy, then paste the role ARN.{" "}
                <Link href="/settings" className="text-[#38BDF8] hover:underline">
                  Full setup guide →
                </Link>
              </p>

              {externalId ? (
                <div className="border border-[#1E293B] bg-[#0F172A] p-3">
                  <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1.5">
                    Trust Policy — External ID:
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-[#38BDF8] font-mono text-[11px] break-all">{externalId}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(externalId)}
                      className="text-slate-500 hover:text-[#38BDF8] text-[10px] shrink-0 transition-colors"
                    >
                      copy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-[#1E293B] bg-[#0F172A] p-3 flex items-center gap-2">
                  <span className="w-3 h-3 border border-[#38BDF8]/20 border-t-[#38BDF8] rounded-full animate-spin shrink-0" />
                  <span className="text-slate-600 text-[10px]">Loading external ID…</span>
                </div>
              )}

              {awsError && (
                <div className="text-[#EF4444] text-xs">{awsError}</div>
              )}

              {awsSequence.length > 0 ? (
                <div className="space-y-1.5">
                  {awsSequence.map((line, i) => (
                    <div
                      key={i}
                      className={`text-sm ${line.startsWith("✓") ? "text-[#22C55E]" : "text-[#38BDF8]"}`}
                    >
                      {line}
                    </div>
                  ))}
                  {!awsSequence.some((l) => l.startsWith("✓")) && (
                    <span className="w-2 h-[1em] bg-[#38BDF8] inline-block align-middle animate-blink" />
                  )}
                </div>
              ) : (
                <>
                  <div className="border border-[#1E293B] p-4 bg-[#0F172A]">
                    <label className="text-slate-500 text-[10px] uppercase tracking-widest block mb-2">
                      IAM Role ARN:
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-slate-600 text-xs">{">"}</span>
                      <input
                        type="text"
                        autoFocus
                        className="bg-transparent outline-none w-full text-white caret-[#38BDF8] text-xs placeholder-slate-700"
                        value={roleArn}
                        onChange={(e) => setRoleArn(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAwsConnect()}
                        placeholder="arn:aws:iam::123456789012:role/devleep-admin"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={handleAwsConnect}
                      className="border border-[#F59E0B] text-[#F59E0B] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#F59E0B] hover:text-[#070B11] transition-colors"
                    >
                      [ $ verify-connection ]
                    </button>
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="text-slate-500 hover:text-white text-xs transition-colors underline decoration-slate-700 underline-offset-4"
                    >
                      Skip for now
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
