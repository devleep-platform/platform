"use client";

import { useState, useEffect } from "react";
import { Copy, CheckCircle2, AlertCircle, Loader } from "lucide-react";
import {
  getAwsConnectSetup,
  verifyAwsRole,
  getAwsIntegration,
  disconnectAws,
  AwsConnectResponse,
  AwsIntegrationStatus,
} from "@/lib/api/aws";

export function CloudIntegrationWizard() {
  const [step, setStep] = useState<"status" | "setup" | "verify">("status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [integration, setIntegration] = useState<AwsIntegrationStatus | null>(null);
  const [setupData, setSetupData] = useState<AwsConnectResponse | null>(null);
  const [roleArn, setRoleArn] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { checkIntegrationStatus(); }, []);

  async function checkIntegrationStatus() {
    try {
      setLoading(true);
      const { data, error: err } = await getAwsIntegration();
      if (err) { setError(err.error || "Failed to check AWS integration status"); setStep("setup"); return; }
      setIntegration(data || null);
      if (data?.connected) { setStep("status"); }
      else { setStep("setup"); loadSetupData(); }
    } catch { setError("Failed to check AWS integration status"); }
    finally { setLoading(false); }
  }

  async function loadSetupData() {
    try {
      const { data, error: err } = await getAwsConnectSetup();
      if (err) { setError(`Failed to load AWS setup: ${typeof err === "string" ? err : JSON.stringify(err)}`); return; }
      setSetupData(data || null);
    } catch { setError("Failed to load AWS setup instructions"); }
  }

  async function handleVerify() {
    if (!roleArn.trim()) { setError("Please enter a Role ARN"); return; }
    try {
      setVerifying(true); setError(""); setSuccess("");
      const { data, error: err } = await verifyAwsRole(roleArn);
      if (err) { setError(err.error || "Failed to verify AWS role"); return; }
      setSuccess("AWS account verified successfully! You can now start labs.");
      setRoleArn(""); setStep("status"); await checkIntegrationStatus();
    } catch { setError("Failed to verify AWS role"); }
    finally { setVerifying(false); }
  }

  async function handleDisconnect() {
    try {
      setLoading(true);
      const { error: err } = await disconnectAws();
      if (err) { setError(err.error || "Failed to disconnect AWS account"); return; }
      setSuccess("AWS account disconnected");
      setIntegration(null); setConfirmDisconnect(false); setStep("setup");
      await loadSetupData();
    } catch { setError("Failed to disconnect AWS account"); }
    finally { setLoading(false); }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <div className="w-4 h-4 border-2 border-[#38BDF8]/20 border-t-[#38BDF8] rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">CHECKING_AWS_STATUS...</span>
      </div>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  if (integration?.connected && step === "status") {
    return (
      <div className="space-y-4">
        {error && (
          <div className="px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] font-mono flex gap-2 items-start">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> ERR: {error}
          </div>
        )}

        <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-bold text-[#22C55E] uppercase tracking-widest mb-3">
              AWS_CONNECTION: ACTIVE
            </p>
            <div className="space-y-2 font-mono text-[10px] bg-[#070B11] border border-[#1E293B] p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 uppercase tracking-wider">Role ARN</span>
                <code className="text-[#38BDF8] truncate max-w-[220px]">{integration.roleArn}</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 uppercase tracking-wider">Region</span>
                <code className="text-[#38BDF8]">{integration.region}</code>
              </div>
              {integration.verifiedAt && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 uppercase tracking-wider">Verified</span>
                  <span className="text-slate-300">{new Date(integration.verifiedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {confirmDisconnect ? (
              <div className="mt-4 bg-[#EF4444]/10 border border-[#EF4444]/20 p-3 font-mono text-xs">
                <p className="text-[#EF4444] mb-3">WARN: This will stop all active labs. Confirm?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    className="border border-[#EF4444] text-[#EF4444] px-3 py-1.5 uppercase tracking-widest text-[10px] hover:bg-[#EF4444] hover:text-[#070B11] transition-colors"
                  >
                    [ DISCONNECT ]
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="border border-[#1E293B] text-slate-500 px-3 py-1.5 uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="mt-3 text-[10px] font-mono text-slate-500 hover:text-[#EF4444] uppercase tracking-widest transition-colors"
              >
                Disconnect Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Setup form ────────────────────────────────────────────────────────────
  if (step === "setup" && setupData) {
    return (
      <div className="space-y-4 font-mono">
        {error && (
          <div className="px-4 py-3 bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex gap-2 items-start">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> ERR: {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#22C55E] flex gap-2 items-start">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {success}
          </div>
        )}

        <p className="text-xs text-slate-400 uppercase tracking-widest">
          AWS Account Setup Instructions
        </p>

        {/* Step 1 */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-4">
          <div className="flex gap-3 mb-3">
            <div className="w-5 h-5 border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#38BDF8]">1</span>
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Create IAM Role in AWS Console
            </p>
          </div>
          <ol className="ml-8 space-y-1.5 text-[10px] text-slate-400">
            <li>• Go to AWS IAM → Roles → Create Role</li>
            <li>• Choose "AWS Account" as trusted entity</li>
            <li>• Account ID: <code className="bg-[#070B11] border border-[#1E293B] px-1 text-[#38BDF8]">{setupData.platformAccountId}</code></li>
            <li>• Enable "Require external ID": <code className="bg-[#070B11] border border-[#1E293B] px-1 text-[#38BDF8]">{setupData.externalId}</code></li>
            <li>• Click "Next"</li>
          </ol>
        </div>

        {/* Step 2 */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-4">
          <div className="flex gap-3 mb-3">
            <div className="w-5 h-5 border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#38BDF8]">2</span>
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Attach Permissions Policy
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mb-3 ml-8">
            Create an inline policy with this JSON:
          </p>
          <div className="ml-8 bg-[#070B11] border border-[#1E293B] p-3 relative group">
            <pre className="text-[10px] overflow-x-auto text-[#38BDF8] leading-relaxed">
              {JSON.stringify(setupData.permissionsPolicy, null, 2)}
            </pre>
            <button
              onClick={() => copyToClipboard(JSON.stringify(setupData.permissionsPolicy, null, 2), "permissions-policy")}
              className="absolute top-2 right-2 border border-[#1E293B] p-1.5 bg-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity hover:border-[#38BDF8]"
            >
              {copied === "permissions-policy" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-4">
          <div className="flex gap-3 mb-3">
            <div className="w-5 h-5 border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#38BDF8]">3</span>
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Copy and Paste Role ARN
            </p>
          </div>
          <p className="text-[10px] text-slate-400 ml-8">
            After creating the role, copy its ARN and paste it below to verify.
          </p>
        </div>

        {/* Step 4: Verify */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-4">
          <div className="flex gap-3 mb-4">
            <div className="w-5 h-5 border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#38BDF8]">4</span>
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Verify Connection
            </p>
          </div>
          <div className="ml-8 space-y-3">
            <input
              type="text"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/YourRoleName"
              className="w-full bg-[#070B11] border border-[#1E293B] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#38BDF8] transition-colors"
            />
            <button
              onClick={handleVerify}
              disabled={verifying || !roleArn.trim()}
              className="w-full bg-[#38BDF8] text-[#070B11] text-xs font-bold py-2.5 uppercase tracking-widest hover:bg-[#7DD3FC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  VERIFYING...
                </>
              ) : (
                "[ VERIFY AWS ROLE ]"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
