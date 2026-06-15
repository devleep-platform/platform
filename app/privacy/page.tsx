import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "DevLeep Privacy Policy — how we collect, store, and protect your data. Effective 1 June 2025.",
  openGraph: { title: "Privacy Policy — Devleep", url: "https://devleep.com/privacy" },
};

const EFFECTIVE_DATE = "1 June 2025";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="max-w-[760px] mx-auto px-6 py-20 font-sans">

        <div className="mb-12">
          <p className="text-[#38BDF8] text-[10px] font-mono uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-500 font-mono text-xs">Effective {EFFECTIVE_DATE}</p>
        </div>

        <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-12">
          {"─".repeat(200)}
        </div>

        <div className="space-y-12 text-slate-400 leading-relaxed text-sm">

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">1. What We Collect</h2>
            <p className="mb-3">When you create an account we collect:</p>
            <ul className="space-y-2 ml-4">
              {[
                ["Email address", "used for authentication and account communications"],
                ["Name", "optional, used to personalise your dashboard"],
                ["Hashed password", "we never store your password in plain text"],
              ].map(([item, desc]) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span><span className="text-white">{item}</span> — {desc}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 mb-3">When you connect an AWS account we store:</p>
            <ul className="space-y-2 ml-4">
              {[
                ["IAM Role ARN", "the role you create in your AWS account for DevLeep to assume"],
                ["External ID", "a unique identifier generated per account, used in the trust policy"],
                ["AWS region", "the region where your labs are provisioned"],
              ].map(([item, desc]) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span><span className="text-white">{item}</span> — {desc}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 mb-3">During active labs we collect:</p>
            <ul className="space-y-2 ml-4">
              {[
                ["Lab progress", "which objectives you have completed, validation results"],
                ["Session metadata", "start time, end time, terraform module used"],
                ["No terminal content", "we do not log or store the commands you type in the terminal"],
              ].map(([item, desc]) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span><span className="text-white">{item}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">2. What We Do Not Collect</h2>
            <ul className="space-y-2 ml-4">
              {[
                "Long-lived AWS access keys or secret keys",
                "The contents of your terminal sessions",
                "Any data from your AWS account other than what is necessary to provision and validate lab infrastructure",
                "Payment card details — billing is handled entirely by Stripe",
                "Behavioural tracking, advertising identifiers, or third-party analytics cookies",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#EF4444] font-mono shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">3. How We Use Your Data</h2>
            <ul className="space-y-2 ml-4">
              {[
                "Authenticate your account and maintain your session",
                "Provision Terraform infrastructure in your AWS account when you start a lab",
                "Run automated validation checks against your lab environment",
                "Track your progress across labs and tracks",
                "Send transactional emails (account confirmation, password reset)",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#22C55E] font-mono shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">4. AWS Credentials</h2>
            <p className="mb-3">
              Your AWS connection uses cross-account IAM role assumption, not stored credentials. DevLeep never receives or stores your AWS Access Key ID or Secret Access Key.
            </p>
            <p className="mb-3">
              The IAM role ARN and external ID we store are used solely to call <span className="font-mono text-white">sts:AssumeRole</span> when you start a lab session. The resulting temporary credentials are scoped to that session and discarded when the lab ends.
            </p>
            <p>
              You can disconnect your AWS account at any time from the Settings page. Disconnecting deletes the stored ARN and external ID from our database immediately.
            </p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">5. Data Retention</h2>
            <ul className="space-y-2 ml-4">
              {[
                ["Active accounts", "data is retained while your account is active"],
                ["Deleted accounts", "all personal data is deleted within 30 days of account deletion"],
                ["Lab session data", "retained for 90 days to allow progress review, then purged"],
                ["Logs", "system logs are retained for 30 days for debugging, then deleted"],
              ].map(([item, desc]) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span><span className="text-white">{item}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 ml-4">
              {[
                "Access a copy of the personal data we hold about you",
                "Correct inaccurate data",
                "Request deletion of your account and all associated data",
                "Export your lab progress data",
                "Disconnect your AWS account at any time",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email <a href="mailto:privacy@devleep.com" className="text-[#38BDF8] hover:underline">privacy@devleep.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">7. Contact</h2>
            <p>
              Questions about this policy: <a href="mailto:privacy@devleep.com" className="text-[#38BDF8] hover:underline">privacy@devleep.com</a>
            </p>
          </section>

        </div>
      </div>
    </PublicShell>
  );
}
