"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { DarkAppShell } from "@/components/layout/DarkAppShell";
import { CloudIntegrationWizard } from "@/components/aws/CloudIntegrationWizard";
import { ActiveEnvironmentsPanel } from "@/components/lab/ActiveEnvironmentsPanel";
import { useAuthStore } from "@/lib/store/auth-store";
import { updateProfile } from "@/lib/api/auth";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user, setUser, logout } = useAuthStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    } else if (user) {
      setEmail(user.email || "");
      setName(user.name || "");
    }
  }, [isAuthenticated, loading, router, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B11] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#38BDF8]/20 border-t-[#38BDF8] animate-spin" />
      </div>
    );
  }

  return (
    <DarkAppShell title="Configuration & Settings">
      <div className="p-6 sm:p-8 max-w-[1200px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 font-sans">
            Operator Config
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Manage your profile and AWS cloud integration.
          </p>
          <div className="mt-6 text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none">
            {"─".repeat(160)}
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Profile Section ─────────────────────────────────────── */}
          <section className="bg-[#0F172A] border border-[#1E293B]">
            <div className="px-6 py-3 border-b border-[#1E293B] bg-[#070B11]">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                PROFILE_IDENTITY
              </span>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              {/* Left: avatar */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-[#1E293B] border border-[#1E293B] flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-[#38BDF8]">
                    {(user?.name?.[0] ?? user?.email?.[0] ?? "O").toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-white font-bold font-sans">
                    {user?.name || "Operator"}
                  </div>
                  <div className="text-slate-500 font-mono text-xs mt-0.5">
                    {user?.email}
                  </div>
                  <div className="text-[#38BDF8] font-mono text-[10px] mt-2 uppercase">
                    L2 Engineer
                  </div>
                </div>
              </div>

              {/* Right: form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-mono">
                    Email Address
                  </label>
                  <input
                    className="w-full bg-[#070B11] border border-[#1E293B] px-3 py-2.5 text-sm text-slate-400 font-mono cursor-not-allowed"
                    type="email"
                    value={email}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-mono">
                    Full Name
                  </label>
                  <input
                    className="w-full bg-[#070B11] border border-[#1E293B] px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#38BDF8] transition-colors"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                {saveError && (
                  <p className="text-xs text-[#EF4444] font-mono">ERR: {saveError}</p>
                )}
                {saveOk && (
                  <p className="text-xs text-[#22C55E] font-mono">PROFILE_UPDATED: OK</p>
                )}

                <button
                  onClick={async () => {
                    setSaving(true);
                    setSaveError(null);
                    setSaveOk(false);
                    const { data, error } = await updateProfile(name);
                    if (error) {
                      setSaveError(error.error || "Failed to save profile");
                    } else if (data) {
                      setUser({ id: data.id, email: data.email, name: data.name });
                      setSaveOk(true);
                    }
                    setSaving(false);
                  }}
                  disabled={saving}
                  className="border border-[#38BDF8] text-[#38BDF8] font-mono text-xs uppercase px-4 py-3 sm:py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors disabled:opacity-50 tracking-widest"
                >
                  {saving ? "SAVING..." : "[ SAVE CHANGES ]"}
                </button>
              </div>
            </div>
          </section>

          {/* ── AWS Integration ──────────────────────────────────────── */}
          <section className="bg-[#0F172A] border border-[#1E293B]">
            <div className="px-6 py-3 border-b border-[#1E293B] bg-[#070B11]">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                AWS_ACCOUNT_INTEGRATION
              </span>
            </div>
            <div className="p-6">
              <p className="text-slate-500 font-mono text-xs mb-6">
                Connect your AWS account to provision real lab infrastructure. Setup takes ~5 minutes, one-time only.
              </p>
              <CloudIntegrationWizard />
            </div>
          </section>

          {/* ── Active Environments ──────────────────────────────────── */}
          <section className="bg-[#0F172A] border border-[#1E293B]">
            <div className="px-6 py-3 border-b border-[#1E293B] bg-[#070B11]">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                ACTIVE_ENVIRONMENTS
              </span>
            </div>
            <div className="p-6">
              <p className="text-slate-500 font-mono text-xs mb-6">
                Shared AWS infrastructure reused across labs. End an environment to release resources and stop billing.
              </p>
              <ActiveEnvironmentsPanel />
            </div>
          </section>

          {/* ── Session ──────────────────────────────────────────────── */}
          <section className="bg-[#0F172A] border border-[#EF4444]/20">
            <div className="px-6 py-3 border-b border-[#EF4444]/20 bg-[#070B11]">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#EF4444]/70">
                SESSION
              </span>
            </div>
            <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-white font-mono text-xs font-bold mb-1">Log Out</p>
                <p className="text-slate-500 font-mono text-xs">
                  Ends your session and clears the local auth token.
                </p>
              </div>
              <button
                onClick={() => { logout(); router.push("/auth/login"); }}
                className="flex items-center gap-2 border border-[#EF4444]/40 text-[#EF4444] font-mono text-xs uppercase tracking-widest px-4 py-3 sm:py-2 hover:bg-[#EF4444] hover:text-[#070B11] transition-colors shrink-0"
              >
                <LogOut size={13} />
                [ Log Out ]
              </button>
            </div>
          </section>
        </div>
      </div>
    </DarkAppShell>
  );
}
