import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "About",
  description:
    "DevLeep exists because most DevOps training teaches commands but never puts you in a real incident. We think that is broken.",
  openGraph: { title: "About — Devleep", url: "https://devleep.com/about" },
};

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="max-w-[760px] mx-auto px-6 py-20">

        {/* Header */}
        <div className="mb-16">
          <p className="text-[#38BDF8] text-[10px] uppercase tracking-widest mb-3">About</p>
          <h1 className="text-3xl font-bold text-white font-sans mb-4">
            We think tutorials are broken.
          </h1>
          <p className="text-slate-400 font-sans leading-relaxed text-base">
            DevLeep exists because most DevOps training teaches you commands but never puts you in a situation where something is actually broken and the clock is ticking.
          </p>
        </div>

        <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-16">
          {"─".repeat(200)}
        </div>

        {/* The problem */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] uppercase tracking-widest font-mono mb-4">The Problem</h2>
          <div className="space-y-4 text-slate-400 font-sans leading-relaxed">
            <p>
              You can finish a 40-hour Kubernetes course and still freeze the first time a production pod enters a crash loop. That is not your fault — it is the fault of how the training was designed.
            </p>
            <p>
              Sandboxed environments give you a clean, predictable system. Production gives you a system that has been running for months, touched by a dozen people, and is failing in a way the documentation never described.
            </p>
            <p>
              The gap between "I know the commands" and "I can handle an incident" is experience. DevLeep is how you get that experience without waiting for it to happen to you at 2 AM.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] uppercase tracking-widest font-mono mb-6">How It Works</h2>
          <div className="space-y-4">
            {[
              ["Your infrastructure", "Labs run in your own AWS account. We provision a real EC2 instance, real VPC, real disk. When you fix the problem, you are fixing it on actual infrastructure — not a simulator."],
              ["Real incident scenarios", "Every lab is based on a class of production incident: disk exhaustion, misconfigured nginx, OOM kills, failed deployments, certificate expiry. Each one has a root cause and a correct fix."],
              ["Automated validation", "When you think you have fixed the incident, you run the validation suite. It executes real checks against your environment — no self-reporting, no honour system."],
              ["Open lab definitions", "The lab definitions — YAML files that describe the scenario, objectives, hints, and validation rules — are open source. Anyone can read them, improve them, or contribute new ones."],
            ].map(([title, body]) => (
              <div key={title} className="border border-[#1E293B] bg-[#0F172A] p-5">
                <p className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-2">{title}</p>
                <p className="text-slate-400 font-sans text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tracks */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] uppercase tracking-widest font-mono mb-4">What We Cover</h2>
          <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
            Three tracks, each progressing from orientation through intermediate diagnostics to advanced failure modes.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 font-mono text-xs">
            {[
              ["Linux Core", "File systems, processes, networking, permissions, systemd, cron, disk management"],
              ["Containers", "Docker internals, failed builds, network isolation, volume mounts, compose failures"],
              ["Kubernetes", "Pod failures, scheduler issues, RBAC, ingress, persistent volumes, cluster degradation"],
            ].map(([track, desc]) => (
              <div key={track} className="border border-[#1E293B] p-4">
                <p className="text-[#38BDF8] font-bold mb-2">{track}</p>
                <p className="text-slate-500 text-[10px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open source */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] uppercase tracking-widest font-mono mb-4">Open Source</h2>
          <p className="text-slate-400 font-sans text-sm leading-relaxed mb-4">
            The lab definition format is public. Every scenario, every validation check, every hint is a YAML file in a public repository. We believe incident training improves when the community can inspect and improve the material.
          </p>
          <p className="text-slate-400 font-sans text-sm leading-relaxed">
            If you have been through a real outage and want to turn it into a lab, the contributing guide explains the format in full.
          </p>
          <div className="mt-4 flex gap-3 font-mono text-xs">
            <a href="https://github.com/devleep/labs" target="_blank" rel="noopener noreferrer"
              className="border border-[#38BDF8] text-[#38BDF8] px-3 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors uppercase tracking-widest">
              View on GitHub
            </a>
            <Link href="/docs" className="border border-[#1E293B] text-slate-400 px-3 py-2 hover:border-slate-400 hover:text-white transition-colors uppercase tracking-widest">
              Lab Definition Docs
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-[10px] text-[#38BDF8] uppercase tracking-widest font-mono mb-4">Contact</h2>
          <div className="space-y-2 font-mono text-xs text-slate-400">
            <p>General: <a href="mailto:hello@devleep.com" className="text-[#38BDF8] hover:underline">hello@devleep.com</a></p>
            <p>Security: <a href="mailto:security@devleep.com" className="text-[#38BDF8] hover:underline">security@devleep.com</a></p>
            <p>GitHub: <a href="https://github.com/devleep" target="_blank" rel="noopener noreferrer" className="text-[#38BDF8] hover:underline">github.com/devleep</a></p>
          </div>
        </section>

      </div>
    </PublicShell>
  );
}
