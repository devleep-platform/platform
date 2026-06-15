import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "DevLeep Terms of Service — your rights and responsibilities when using the platform. Effective 1 June 2025.",
  openGraph: { title: "Terms of Service — Devleep", url: "https://devleep.com/terms" },
};

const EFFECTIVE_DATE = "1 June 2025";

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="max-w-[760px] mx-auto px-6 py-20 font-sans">

        <div className="mb-12">
          <p className="text-[#38BDF8] text-[10px] font-mono uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-slate-500 font-mono text-xs">Effective {EFFECTIVE_DATE}</p>
        </div>

        <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-12">
          {"─".repeat(200)}
        </div>

        <div className="space-y-12 text-slate-400 leading-relaxed text-sm">

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">1. Acceptance</h2>
            <p>
              By creating a DevLeep account or using the platform in any way, you agree to these terms. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">2. What DevLeep Provides</h2>
            <p className="mb-3">DevLeep provides:</p>
            <ul className="space-y-2 ml-4">
              {[
                "A library of hands-on DevOps lab scenarios based on real production incident patterns",
                "Terraform automation to provision temporary infrastructure in your AWS account",
                "An automated validation system that checks whether you have correctly resolved the lab scenario",
                "Progress tracking across labs and learning tracks",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">3. Your AWS Account</h2>
            <p className="mb-3">
              DevLeep provisions real infrastructure in your AWS account. You are responsible for:
            </p>
            <ul className="space-y-2 ml-4">
              {[
                "Any AWS costs incurred during lab sessions. DevLeep provisions resources on your behalf and those resources are billed directly by AWS to your account.",
                "Ensuring the IAM role you create for DevLeep follows the principle of least privilege. The recommended permissions policy is provided in the setup guide.",
                "Terminating lab environments when you are done. DevLeep will automatically end sessions after the timeout period, but you can also end them manually from the Settings page.",
                "The security of your AWS account. DevLeep's access is limited to the IAM role you create.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4 font-mono text-xs text-[#F59E0B]">
              WARN: Most labs cost less than $0.05 in AWS charges. DevLeep does not mark up or profit from AWS usage — you pay AWS directly at standard rates.
            </div>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">4. Acceptable Use</h2>
            <p className="mb-3">You may not use DevLeep to:</p>
            <ul className="space-y-2 ml-4">
              {[
                "Provision infrastructure for purposes unrelated to the lab you are running",
                "Attempt to access other users' environments or data",
                "Automate lab completions or manipulate the validation system",
                "Redistribute lab content for commercial purposes without written permission",
                "Use the platform for any activity that violates applicable law",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#EF4444] font-mono shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">5. Open Source Content</h2>
            <p className="mb-3">
              The lab definition files (YAML scenarios, validation rules, hint content) are released under the MIT Licence and are publicly available on GitHub. You may fork, adapt, and redistribute them under the terms of that licence.
            </p>
            <p>
              The DevLeep platform code (frontend, backend, Terraform modules) is separately licenced. Contact us if you want to self-host DevLeep.
            </p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">6. Accounts</h2>
            <ul className="space-y-2 ml-4">
              {[
                "You are responsible for keeping your account credentials secure",
                "You must be at least 16 years old to create an account",
                "One person per account — account sharing is not permitted",
                "We reserve the right to suspend accounts that violate these terms",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">7. Availability & Warranty</h2>
            <p className="mb-3">
              DevLeep is provided "as is." We do not guarantee uptime, and we provide no warranty that the platform will be free of errors or that lab infrastructure will always provision successfully.
            </p>
            <p>
              We are not liable for AWS costs resulting from infrastructure that fails to terminate, though we make every effort to ensure all resources are cleaned up when a lab session ends.
            </p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">8. Changes to These Terms</h2>
            <p>
              We may update these terms. If we make material changes, we will notify you by email at least 14 days before they take effect. Continued use of the platform after the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">9. Contact</h2>
            <p>
              Questions about these terms: <a href="mailto:legal@devleep.com" className="text-[#38BDF8] hover:underline">legal@devleep.com</a>
            </p>
          </section>

        </div>
      </div>
    </PublicShell>
  );
}
