import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How DevLeep handles AWS credentials, IAM role assumption, temporary credential scoping, and vulnerability disclosure.",
  openGraph: { title: "Security — Devleep", url: "https://devleep.com/security" },
};

export default function SecurityPage() {
  return (
    <PublicShell>
      <div className="max-w-[760px] mx-auto px-6 py-20 font-sans">

        <div className="mb-12">
          <p className="text-[#38BDF8] text-[10px] font-mono uppercase tracking-widest mb-3">Company</p>
          <h1 className="text-3xl font-bold text-white mb-2">Security</h1>
          <p className="text-slate-400 leading-relaxed mt-4">
            DevLeep provisions real AWS infrastructure on your behalf. We take the security of that access seriously. This page describes how we handle credentials, what permissions we use, and how to report vulnerabilities.
          </p>
        </div>

        <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-12">
          {"─".repeat(200)}
        </div>

        <div className="space-y-12 text-slate-400 leading-relaxed text-sm">

          {/* AWS access model */}
          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">AWS Access Model</h2>
            <p className="mb-4">
              DevLeep uses cross-account IAM role assumption — the same pattern used by AWS-native tools like CloudFormation StackSets and AWS Control Tower. We never ask for or store your AWS Access Key ID or Secret Access Key.
            </p>
            <div className="space-y-3">
              {[
                {
                  label: "Cross-account role assumption",
                  body: "You create an IAM role in your account with a trust policy that allows only our platform account to assume it, and only when the correct external ID is provided. Without the external ID, the assume-role call fails even if someone knows the role ARN.",
                },
                {
                  label: "External ID",
                  body: "Every DevLeep account gets a unique external ID generated at registration time. This prevents confused deputy attacks — a third party that learns your role ARN cannot assume it without the external ID.",
                },
                {
                  label: "Temporary credentials only",
                  body: "When you start a lab, we call sts:AssumeRole to obtain a set of temporary credentials scoped to that session. Those credentials expire when the session ends (default: 4 hours maximum). We do not cache or reuse credentials between sessions.",
                },
                {
                  label: "Least-privilege permissions",
                  body: "The permissions policy we recommend grants access only to the services needed by lab terraform modules: EC2, VPC networking, and EKS for Kubernetes labs. We publish the exact policy in the setup guide so you can review it before attaching it.",
                },
              ].map(({ label, body }) => (
                <div key={label} className="border border-[#1E293B] bg-[#0F172A] p-5">
                  <p className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Platform security */}
          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">Platform Security</h2>
            <ul className="space-y-3 ml-4">
              {[
                ["Passwords", "Stored using bcrypt with a per-user salt. We never log or transmit plain-text passwords."],
                ["Auth tokens", "JWT tokens signed with a rotating secret. Tokens are short-lived and must be refreshed."],
                ["Role ARNs", "Stored encrypted at rest in the database. Decrypted only when needed to call sts:AssumeRole."],
                ["Transport", "All traffic between the client, our API, and AWS uses TLS 1.2 or later. We do not support unencrypted connections."],
                ["Database", "Credentials are never committed to source control. The database is not publicly accessible — only the application server can connect."],
                ["Terminal sessions", "Lab terminals connect directly via Cloudflare Tunnel to your EC2 instance. Terminal I/O does not pass through our servers."],
              ].map(([label, body]) => (
                <li key={label} className="flex gap-3">
                  <span className="text-[#22C55E] font-mono shrink-0 mt-0.5">✓</span>
                  <span><span className="text-white">{label}</span> — {body}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* What we can't protect */}
          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">What Is Your Responsibility</h2>
            <p className="mb-3">
              Because labs run in your AWS account, you control the blast radius of our access:
            </p>
            <ul className="space-y-2 ml-4">
              {[
                "Use a dedicated AWS account for DevLeep, separate from production workloads",
                "Apply the recommended permissions policy — do not grant AdministratorAccess",
                "Set an AWS budget alert to notify you if lab costs exceed your expectations",
                "Disconnect DevLeep from Settings when you are not actively using the platform",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#38BDF8] font-mono shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Vulnerability disclosure */}
          <section>
            <h2 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">Vulnerability Disclosure</h2>
            <p className="mb-4">
              If you find a security vulnerability in DevLeep, please report it responsibly. We are a small team and take every report seriously.
            </p>

            <div className="border border-[#1E293B] bg-[#0F172A] p-5 font-mono text-xs space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-[#38BDF8]">EMAIL</span>
                <a href="mailto:security@devleep.com" className="text-white hover:underline">security@devleep.com</a>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#38BDF8]">SUBJECT</span>
                <span className="text-slate-400">[SECURITY] Brief description of the issue</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#38BDF8]">INCLUDE</span>
                <span className="text-slate-400">Steps to reproduce, affected component, impact assessment, suggested fix if you have one</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-[#38BDF8]">RESPONSE</span>
                <span className="text-slate-400">We aim to acknowledge reports within 48 hours and provide a fix timeline within 7 days</span>
              </div>
            </div>

            <p className="mt-4">
              Please do not publicly disclose the vulnerability until we have had a chance to investigate and release a fix. We will credit researchers who report valid issues.
            </p>

            <div className="mt-4 border border-[#EF4444]/20 bg-[#EF4444]/5 p-4 font-mono text-xs text-[#EF4444]/80">
              Out of scope: DoS attacks, brute-force credential stuffing, social engineering, and issues in third-party dependencies that are already publicly known.
            </div>
          </section>

        </div>
      </div>
    </PublicShell>
  );
}
