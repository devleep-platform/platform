import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Every DevLeep lab scenario is an open-source YAML file. The community writes, reviews, and improves them. Turn your real incidents into labs.",
  openGraph: { title: "Community — Devleep", url: "https://devleep.com/community" },
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border"
      style={{ color, borderColor: `${color}40` }}>
      {label}
    </span>
  );
}

export default function CommunityPage() {
  return (
    <PublicShell>
      <div className="max-w-[800px] mx-auto px-6 py-20">

        {/* Header */}
        <div className="mb-14">
          <p className="text-[#38BDF8] text-[10px] font-mono uppercase tracking-widest mb-3">Community</p>
          <h1 className="text-3xl font-bold text-white font-sans mb-4">
            Open Source Lab Definitions
          </h1>
          <p className="text-slate-400 font-sans leading-relaxed text-base">
            Every lab scenario on DevLeep is a YAML file in a public repository. The community writes, reviews, and improves them. If you have been through a real incident, you can turn it into a lab that helps thousands of engineers who haven&apos;t.
          </p>
        </div>

        <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-14">
          {"─".repeat(200)}
        </div>

        {/* GitHub CTA */}
        <div className="border border-[#1E293B] bg-[#0F172A] p-6 mb-14 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <p className="text-white font-mono text-sm font-bold mb-1">github.com/devleep/labs</p>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">YAML lab definitions · MIT Licence · PRs welcome</p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-xs w-full sm:w-auto">
            <a href="https://github.com/devleep/labs" target="_blank" rel="noopener noreferrer"
              className="border border-[#38BDF8] text-[#38BDF8] px-4 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors uppercase tracking-widest">
              Open GitHub
            </a>
            <a href="https://github.com/devleep/labs/issues/new" target="_blank" rel="noopener noreferrer"
              className="border border-[#1E293B] text-slate-400 px-4 py-2 hover:border-slate-400 hover:text-white transition-colors uppercase tracking-widest">
              Open Issue
            </a>
          </div>
        </div>

        {/* Ways to contribute */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-6">Ways to Contribute</h2>
          <div className="space-y-3">
            {[
              {
                tag: "HIGH VALUE",
                tagColor: "#22C55E",
                title: "Submit a new lab based on a real incident",
                body: "Turn an outage you have been through into a lab. The most effective scenarios come from real production failures — not synthetic exercises. Write the YAML, test the validation checks, include all three hint levels.",
              },
              {
                tag: "GOOD FIRST ISSUE",
                tagColor: "#38BDF8",
                title: "Improve existing hint quality",
                body: "Many labs have sparse Level 2 and Level 3 hints. If you solved a lab the hard way and found the hints were not helpful, you are exactly the right person to improve them. Open the YAML, make it clearer, submit a PR.",
              },
              {
                tag: "ONGOING",
                tagColor: "#F59E0B",
                title: "Review open pull requests",
                body: "Every new lab needs a technical review. Did you read the YAML, provision the lab, and verify the validation checks actually catch what they should? A confirmed test result in the PR is worth more than a comment.",
              },
              {
                tag: "DISCUSSION",
                tagColor: "#A78BFA",
                title: "Propose new scenario ideas",
                body: "If you have an incident pattern that would make a good lab but don't have time to implement it yet, open an issue describing the scenario. Include: what broke, what the operator would need to do, and what a validation check might look like.",
              },
            ].map(({ tag, tagColor, title, body }) => (
              <div key={title} className="border border-[#1E293B] bg-[#0F172A] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Badge label={tag} color={tagColor} />
                </div>
                <p className="text-white font-mono text-xs font-bold mb-2">{title}</p>
                <p className="text-slate-400 font-sans text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to create a lab */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-2">How to Create a Lab</h2>
          <p className="text-slate-400 font-sans text-sm mb-6">
            The complete field reference is in the <Link href="/docs" className="text-[#38BDF8] hover:underline">documentation</Link>. These are the steps:
          </p>
          <div className="space-y-2">
            {[
              ["1", "Fork github.com/devleep/labs and clone your fork"],
              ["2", "Add your lab to labdefinations.yaml following the YAML schema"],
              ["3", "Run the seed script locally to verify the YAML parses correctly"],
              ["4", "Provision the target module via terraform apply and reproduce the broken scenario"],
              ["5", "Apply the fix and confirm every validation check passes — screenshot the output"],
              ["6", "Write Level 1 (directional), Level 2 (commands), and Level 3 (walkthrough) hints"],
              ["7", "Open a pull request with: the YAML changes, a one-paragraph description of the real incident, and your validation screenshot"],
            ].map(([num, step]) => (
              <div key={num} className="flex gap-4 border border-[#1E293B] px-4 py-3 font-mono text-xs items-start">
                <span className="text-[#38BDF8] shrink-0 w-4">{num}.</span>
                <span className="text-slate-400 font-sans text-sm">{step}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/docs" className="font-mono text-xs border border-[#38BDF8] text-[#38BDF8] px-4 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-colors uppercase tracking-widest">
              Lab Format Docs
            </Link>
          </div>
        </section>

        {/* Lab quality bar */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-6">What Makes a Good Lab</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Based on a real failure pattern",
                desc: "Not a contrived exercise. There should be a class of production incidents that this lab teaches the operator to recognise and resolve.",
              },
              {
                label: "Validation tests the outcome",
                desc: "Checks should verify the fix worked — service is running, config is correct, resource is available — not just that a file exists.",
              },
              {
                label: "All three hint levels written",
                desc: "Level 1 directional, Level 2 specific, Level 3 full walkthrough. Someone completely stuck at 2 AM should be able to get unstuck.",
              },
              {
                label: "Scenario is realistic",
                desc: "The broken state should look like something that could realistically end up in production — misconfiguration, version drift, resource exhaustion.",
              },
              {
                label: "Objectives are specific",
                desc: "List what the operator will learn, not what they will do. 'Diagnose and repair a misconfigured systemd unit' beats 'Fix the service'.",
              },
              {
                label: "Validation is idempotent",
                desc: "Running the validation twice should give the same result. Checks should not depend on timing or side effects from a previous check.",
              },
            ].map(({ label, desc }) => (
              <div key={label} className="border border-[#1E293B] p-4">
                <div className="flex gap-2 items-start mb-2">
                  <span className="text-[#22C55E] font-mono text-xs shrink-0 mt-0.5">✓</span>
                  <p className="text-white font-mono text-xs font-bold">{label}</p>
                </div>
                <p className="text-slate-500 text-xs font-sans leading-relaxed pl-5">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-6">Track Roadmap</h2>
          <p className="text-slate-400 font-sans text-sm mb-6">
            These are the tracks planned or in progress. Labs within each track are prioritised by how commonly the failure pattern appears in production.
          </p>
          <div className="space-y-2 font-mono text-xs">
            {[
              {
                track: "Linux Core",
                status: "ACTIVE",
                statusColor: "#22C55E",
                labs: ["Server orientation", "Process management", "Disk exhaustion", "Permission errors", "Systemd unit failures", "Cron debugging", "Log investigation"],
              },
              {
                track: "Containers",
                status: "PLANNED",
                statusColor: "#F59E0B",
                labs: ["Docker build failures", "Container networking isolation", "Volume mount issues", "Compose startup order", "Registry auth failures", "Resource limits"],
              },
              {
                track: "Kubernetes",
                status: "PLANNED",
                statusColor: "#F59E0B",
                labs: ["Pod crash loops", "ImagePullBackOff", "RBAC permission denied", "Ingress misconfiguration", "PVC binding failures", "Node pressure eviction", "Network policy blocks"],
              },
            ].map(({ track, status, statusColor, labs }) => (
              <div key={track} className="border border-[#1E293B] bg-[#0F172A]">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1E293B]">
                  <span className="text-white font-bold">{track}</span>
                  <Badge label={status} color={statusColor} />
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1">
                  {labs.map((lab) => (
                    <span key={lab} className="text-slate-500 text-[10px]">· {lab}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-slate-500 font-sans text-xs">
            If you want to accelerate a particular area, open an issue or submit a lab.
          </p>
        </section>

        {/* Scenarios format */}
        <section className="mb-14">
          <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-4">Scenarios vs Labs</h2>
          <p className="text-slate-400 font-sans text-sm leading-relaxed mb-4">
            A <strong className="text-white">scenario</strong> is the broken environment — an EC2 instance set up in a specific failed state. A <strong className="text-white">lab</strong> is the task within that scenario.
          </p>
          <p className="text-slate-400 font-sans text-sm leading-relaxed mb-4">
            One scenario can host multiple labs at different difficulty levels. For example, a <code className="font-mono text-[#38BDF8] text-xs">scenario_id: nginx-config-error</code> might have a beginner lab that asks the operator to find and fix a syntax error, and an intermediate lab that adds a failing upstream and missing SSL cert to the same environment.
          </p>
          <div className="border border-[#1E293B] bg-[#0F172A] p-4 font-mono text-xs text-slate-500">
            <span className="text-[#38BDF8]">scenario_id</span> in the lab YAML links the lab to a scenario. The scenario defines the Terraform userdata that breaks the environment. The lab defines what the operator needs to do to pass.
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-4">Get in Touch</h2>
          <div className="space-y-2 font-mono text-xs text-slate-400">
            <p>GitHub: <a href="https://github.com/devleep/labs" target="_blank" rel="noopener noreferrer" className="text-[#38BDF8] hover:underline">github.com/devleep/labs</a></p>
            <p>Issues: <a href="https://github.com/devleep/labs/issues" target="_blank" rel="noopener noreferrer" className="text-[#38BDF8] hover:underline">github.com/devleep/labs/issues</a></p>
            <p>General: <a href="mailto:hello@devleep.com" className="text-[#38BDF8] hover:underline">hello@devleep.com</a></p>
          </div>
        </section>

      </div>
    </PublicShell>
  );
}
