"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clipboard, Cloud, KeyRound, ShieldCheck } from "lucide-react";
import type { CloudProvider } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = [
  { id: "provider", label: "Provider",  icon: Cloud       },
  { id: "script",   label: "Script",    icon: KeyRound    },
  { id: "verify",   label: "Verify",    icon: ShieldCheck },
];

interface AWSConnectResponse {
  externalId: string;
  platformAccountId: string;
  trustPolicy: Record<string, unknown>;
  permissionsPolicy: Record<string, unknown>;
  maxSessionDurationSeconds?: number;
  maxSessionDurationCommand?: string;
  instructions: Record<string, string>;
}

export function CloudConnectWizard() {
  const [provider, setProvider] = useState<CloudProvider>("aws");
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [awsConfig, setAwsConfig] = useState<AWSConnectResponse | null>(null);
  const [roleArn, setRoleArn] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeStep = steps[stepIndex];

  useEffect(() => {
    if (provider === "aws" && stepIndex > 0 && !awsConfig) {
      const cached = sessionStorage.getItem("aws_connect_config");
      if (cached) {
        try { setAwsConfig(JSON.parse(cached)); return; } catch {}
      }
      fetchAWSConfig();
    }
  }, [provider, stepIndex, awsConfig]);

  async function fetchAWSConfig() {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aws/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch AWS configuration");
      const data = await response.json();
      setAwsConfig(data);
      sessionStorage.setItem("aws_connect_config", JSON.stringify(data));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AWS configuration");
    } finally { setLoading(false); }
  }

  async function copyTrustPolicy() {
    if (!awsConfig) return;
    await navigator.clipboard.writeText(JSON.stringify(awsConfig.trustPolicy, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function verifyRole() {
    if (!roleArn.trim()) { setError("Please enter a role ARN"); return; }
    try {
      setLoading(true); setError("");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aws/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ roleArn }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify role");
      }
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify role");
    } finally { setLoading(false); }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_1fr] font-mono">
      {/* Step nav */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-4 flex flex-col">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">
          Connection Flow
        </p>
        <nav className="space-y-2 flex-grow">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active = index === stepIndex;
            const complete = index < stepIndex || (step.id === "verify" && verified);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setStepIndex(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-mono font-bold uppercase tracking-widest transition-colors border",
                  active
                    ? "border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/5"
                    : complete
                    ? "border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/5"
                    : "border-[#1E293B] text-slate-500 hover:text-slate-300 hover:border-[#1E293B]"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{step.label}</span>
                {complete && <CheckCircle2 className="ml-auto w-3.5 h-3.5" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-5 flex flex-col">
        {/* Panel header */}
        <div className="mb-5 pb-4 border-b border-[#1E293B] flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-widest">
            {activeStep.label}
          </span>
          <div className="flex items-center gap-1.5 border border-[#38BDF8]/30 px-2 py-0.5 text-[10px] text-[#38BDF8]">
            <Cloud className="w-3 h-3" />
            {provider === "aws" ? "AWS" : "Azure"}
          </div>
        </div>

        {/* Step 0: Provider selection */}
        {stepIndex === 0 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["aws", "azure"] as CloudProvider[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setProvider(item)}
                  className={cn(
                    "border p-4 text-left transition-colors",
                    provider === item
                      ? "border-[#38BDF8] bg-[#38BDF8]/5"
                      : "border-[#1E293B] bg-[#070B11] hover:border-[#38BDF8]/40"
                  )}
                >
                  <div className="text-xs font-bold text-white uppercase tracking-widest mb-2">
                    {item === "aws" ? "AWS Account" : "Azure Subscription"}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-5">
                    {item === "aws"
                      ? "Create a constrained IAM role for lab provisioning and validation."
                      : "Create a scoped service principal for temporary lab resources."}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStepIndex(1)}
              className="w-full bg-[#38BDF8] text-[#070B11] text-xs font-bold py-2.5 uppercase tracking-widest hover:bg-[#7DD3FC] transition-colors"
            >
              [ Continue ]
            </button>
          </div>
        )}

        {/* Step 1: Script / IAM setup */}
        {stepIndex === 1 && (
          <div className="space-y-4">
            {loading && !awsConfig ? (
              <div className="flex items-center gap-2 py-6">
                <div className="w-4 h-4 border-2 border-[#38BDF8]/20 border-t-[#38BDF8] rounded-full animate-spin" />
                <span className="text-xs text-slate-400">LOADING_AWS_CONFIG...</span>
              </div>
            ) : awsConfig ? (
              <>
                <div className="border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3 text-[10px] text-[#F59E0B]">
                  WARN: Create a new IAM role in your AWS account using the values below.
                </div>

                <div className="space-y-4 text-[10px]">
                  <div>
                    <p className="text-slate-500 uppercase tracking-widest mb-1.5">Step 1 — Account ID</p>
                    <div className="bg-[#070B11] border border-[#1E293B] p-2.5 text-[#38BDF8]">
                      {awsConfig.platformAccountId}
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 uppercase tracking-widest mb-1.5">Step 2 — External ID</p>
                    <div className="bg-[#070B11] border border-[#1E293B] p-2.5 text-[#38BDF8] flex items-center justify-between gap-2">
                      <span>{awsConfig.externalId}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(awsConfig.externalId); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}
                        className="text-slate-500 hover:text-[#38BDF8] transition-colors"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 uppercase tracking-widest mb-1.5">Step 3 — Trust Policy</p>
                    <div className="bg-[#070B11] border border-[#1E293B] p-2.5 relative group">
                      <pre className="overflow-x-auto text-[#38BDF8] max-h-40">
                        {JSON.stringify(awsConfig.trustPolicy, null, 2)}
                      </pre>
                      <button
                        onClick={copyTrustPolicy}
                        className="absolute top-2 right-2 border border-[#1E293B] p-1 bg-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity hover:border-[#38BDF8]"
                      >
                        <Clipboard className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {awsConfig.maxSessionDurationCommand && (
                    <div>
                      <p className="text-slate-500 uppercase tracking-widest mb-1.5">Step 4 — Max Session (run after)</p>
                      <div className="bg-[#070B11] border border-[#1E293B] p-2.5 relative group">
                        <pre className="text-[#38BDF8] overflow-x-auto">{awsConfig.maxSessionDurationCommand}</pre>
                        <button
                          onClick={async () => { await navigator.clipboard.writeText(awsConfig.maxSessionDurationCommand!); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}
                          className="absolute top-2 right-2 border border-[#1E293B] p-1 bg-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity hover:border-[#38BDF8]"
                        >
                          <Clipboard className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-slate-500 uppercase tracking-widest mb-1.5">Permissions Policy (inline)</p>
                    <div className="bg-[#070B11] border border-[#1E293B] p-2.5">
                      <pre className="overflow-x-auto text-[#38BDF8] max-h-40">
                        {JSON.stringify(awsConfig.permissionsPolicy, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStepIndex(2)}
                  className="border border-[#38BDF8] text-[#38BDF8] text-[10px] font-bold py-2 px-4 uppercase tracking-widest hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors"
                >
                  [ I created the role ]
                </button>
              </>
            ) : error ? (
              <div className="px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[10px] text-[#EF4444]">
                ERR: {error}
              </div>
            ) : null}
          </div>
        )}

        {/* Step 2: Verify */}
        {stepIndex === 2 && (
          <div className="space-y-4">
            <div className="bg-[#070B11] border border-[#1E293B] p-3 text-[10px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 uppercase tracking-widest">Provider</span>
                <span className="text-[#38BDF8]">{provider === "aws" ? "AWS" : "Azure"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 uppercase tracking-widest">Verification</span>
                <span className={verified ? "text-[#22C55E]" : "text-[#EF4444]"}>
                  {verified ? "PASSED" : "PENDING"}
                </span>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[10px] text-[#EF4444]">
                ERR: {error}
              </div>
            )}

            {!verified && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                    Role ARN
                  </label>
                  <input
                    type="text"
                    placeholder="arn:aws:iam::YOUR_ACCOUNT:role/YOUR_ROLE_NAME"
                    value={roleArn}
                    onChange={(e) => setRoleArn(e.target.value)}
                    className="w-full px-3 py-2.5 text-[10px] bg-[#070B11] border border-[#1E293B] text-white placeholder-slate-600 focus:outline-none focus:border-[#38BDF8] transition-colors"
                  />
                </div>
                <button
                  onClick={verifyRole}
                  disabled={loading || !roleArn.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#38BDF8] text-[#070B11] text-xs font-bold py-2.5 uppercase tracking-widest hover:bg-[#7DD3FC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {loading ? "VERIFYING..." : "[ VERIFY CONNECTION ]"}
                </button>
              </div>
            )}

            {verified && (
              <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <div className="text-[10px]">
                  <p className="text-[#22C55E] font-bold uppercase tracking-widest mb-1">AWS_CONNECTION: VERIFIED</p>
                  <p className="text-slate-400">The lab runner can now provision resources in your AWS account.</p>
                </div>
              </div>
            )}

            <a
              href="/dashboard"
              className="inline-block border border-[#1E293B] text-slate-500 text-[10px] font-bold py-2 px-4 uppercase tracking-widest hover:text-white hover:border-slate-400 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
