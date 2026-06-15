import type { Metadata } from "next";
import { DarkAppShell } from "@/components/layout/DarkAppShell";

export const metadata: Metadata = {
  title: "Lab Definition Format",
  description:
    "Complete reference for writing Devleep lab definitions — YAML schema, validation check types, hint system, Terraform modules, and a full worked example.",
  openGraph: { title: "Lab Definition Format — Devleep", url: "https://devleep.com/docs" },
};

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-[#070B11] border border-[#1E293B] p-5 text-[#38BDF8] text-xs font-mono overflow-x-auto leading-relaxed custom-scrollbar">
      {children}
    </pre>
  );
}

function Field({
  name, type, required, desc,
}: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div className="py-3 border-b border-[#1E293B] text-xs font-mono">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[#38BDF8]">{name}{required && <span className="text-[#EF4444] ml-1">*</span>}</span>
        <span className="text-[#F59E0B]">{type}</span>
      </div>
      <span className="text-slate-400 font-sans">{desc}</span>
    </div>
  );
}

function Section({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <h2 className="text-[10px] text-[#38BDF8] font-mono font-bold uppercase tracking-widest mb-6">{label}</h2>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <DarkAppShell>
      <div className="max-w-[1000px] mx-auto px-6 py-12 flex gap-12">

        {/* Sidebar TOC */}
        <aside className="hidden lg:flex flex-col gap-2 w-48 shrink-0 font-mono text-[10px] uppercase tracking-widest sticky top-20 self-start">
          <p className="text-slate-600 mb-2">On This Page</p>
          {[
            ["#overview",   "Overview"],
            ["#schema",     "Lab Schema"],
            ["#briefing",   "Briefing & Evidence"],
            ["#validation", "Validation"],
            ["#hints",      "Hint System"],
            ["#modules",    "Terraform Modules"],
            ["#example",    "Full Example"],
            ["#submit",     "Submit"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-slate-500 hover:text-[#38BDF8] transition-colors py-0.5">
              {label}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="mb-14">
            <p className="text-[#38BDF8] text-[10px] font-mono uppercase tracking-widest mb-3">Documentation</p>
            <h1 className="text-3xl font-bold text-white font-sans mb-4">Lab Definition Format</h1>
            <p className="text-slate-400 font-sans leading-relaxed">
              Every Devleep lab is a single YAML file. The file defines the scenario, environment, learning objectives, hint progression, and the automated checks that verify the fix. This page is the complete reference for writing a lab.
            </p>
          </div>

          <div className="text-[#1E293B] font-mono text-xs overflow-hidden whitespace-nowrap select-none mb-14">
            {"─".repeat(200)}
          </div>

          {/* Overview */}
          <Section id="overview" label="Overview">
            <div className="space-y-4 text-slate-400 font-sans text-sm leading-relaxed">
              <p>
                A lab is a YAML file that describes a broken or incomplete environment and the criteria for fixing it. When a student starts a lab, the platform provisions the infrastructure defined by the lab's <code className="font-mono text-[#38BDF8] text-xs">terraform_module</code>, runs the scenario setup, and connects the student to a live terminal. When the student submits, the platform runs the validation checks defined in the YAML against the live instance.
              </p>
              <p>
                As a lab author your job is the YAML file. You describe the scenario, write the validation checks, and provide hints. The platform handles provisioning, terminal access, and grading.
              </p>
            </div>
            <div className="mt-6 border border-[#1E293B] bg-[#0F172A] p-5 font-mono text-xs text-slate-400 space-y-2">
              <div className="flex gap-3">
                <span className="text-[#38BDF8] shrink-0">schema_version: 1</span>
                <span className="text-slate-600">— all labs must declare this at the top</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#38BDF8] shrink-0">terraform_module</span>
                <span className="text-slate-600">— which infrastructure template to provision (see Terraform Modules)</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#38BDF8] shrink-0">validation.checks</span>
                <span className="text-slate-600">— SSH commands and HTTP checks that run against the live instance</span>
              </div>
            </div>
          </Section>

          {/* Schema */}
          <Section id="schema" label="Lab Schema">
            <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
              Fields marked <span className="text-[#EF4444] font-mono text-xs">*</span> are required.
            </p>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">Identity & Classification</h3>
            <div className="border border-[#1E293B] mb-8">
              <div className="px-4">
                <Field name="schema_version" type="integer"  required desc="Always 1. Must be the first field in the file." />
                <Field name="id"             type="string"   required desc="Unique slug used as the URL path. kebab-case. Must be unique across all labs." />
                <Field name="title"          type="string"   required desc="Human-readable lab title. Keep it under 80 characters." />
                <Field name="description"    type="string"   required desc="One or two sentences describing the scenario. Shown on the catalog card and before the lab starts." />
                <Field name="track"          type="string"   required desc="Track this lab belongs to: linux · docker · kubernetes · ansible · git · jenkins." />
                <Field name="module"         type="string"   required desc="Module within the track. e.g. linux-fundamentals · linux-administration · linux-security." />
                <Field name="sort_order"     type="integer"  required desc="Position in the curriculum. Use multiples of 10 (10, 20, 30…) to leave room for future labs." />
                <Field name="difficulty"     type="enum"     required desc="beginner · intermediate · advanced · expert" />
                <Field name="engineer_level" type="enum"     required desc="L1 · L2 · L3 · L4 — maps beginner through expert." />
                <Field name="mode"           type="enum"     required desc="guided — step-by-step tasks. incident — broken environment to diagnose and fix. challenge — open-ended, no hints." />
                <Field name="tags"           type="string[]" required desc="Keywords for search and filtering. Use 4–6 tags per lab." />
              </div>
            </div>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">Timing & Infrastructure</h3>
            <div className="border border-[#1E293B] mb-8">
              <div className="px-4">
                <Field name="estimated_minutes" type="integer" required desc="Expected time to complete. Shown on the catalog card — does not auto-end the session." />
                <Field name="timeout_minutes"   type="integer" required desc="Hard session timeout. Infrastructure is destroyed after this many minutes regardless of completion." />
                <Field name="terraform_module"  type="string"  required desc="Infrastructure template to provision. See the Terraform Modules section for available options." />
                <Field name="scenario_id"       type="string"  required desc="Identifies which scenario setup script to run on the instance after provisioning. e.g. broken-nginx · disk-full · hello-linux" />
                <Field name="prerequisites"     type="string[]" required desc="Lab IDs that should be completed before this one. Use an empty list [] if there are none." />
              </div>
            </div>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">Learning Content</h3>
            <div className="border border-[#1E293B] mb-8">
              <div className="px-4">
                <Field name="objectives"         type="string[]" required desc="3–5 specific learning objectives shown before the lab starts. Be concrete — 'identify the cause of X' not 'learn about X'." />
                <Field name="success_criteria"   type="string[]" required desc="Plain-English list of what passing looks like. Mirrors the validation checks in human-readable form." />
                <Field name="hints"              type="Hint[]"   required desc="Progressive hint levels (1–3). See the Hint System section." />
                <Field name="hint_policy"        type="enum"     required desc="show_level_1_automatically — Level 1 is shown on load. manual_only — student must request all hints." />
                <Field name="validation"         type="Validation" required desc="Automated checks that run against the live instance. See the Validation section." />
                <Field name="completion_message" type="string"          desc="2–3 sentences shown after all checks pass. Reinforce the key lesson." />
                <Field name="deliverables"       type="Deliverable[]"   desc="Explicit files or outputs the student must produce. Each maps to one or more validation checks." />
              </div>
            </div>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">metadata block (optional)</h3>
            <p className="text-slate-400 font-sans text-sm mb-4">
              Include this block when submitting — it helps the review team track authorship and version history.
            </p>
            <Code>{`metadata:
  version: 1.0.0
  author: your-name
  reviewed_by: []
  last_updated: 2026-06-14`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4 mt-8">environment block (optional)</h3>
            <p className="text-slate-400 font-sans text-sm mb-4">
              Declare the infrastructure the lab requires. Used for cost estimation and catalog display.
            </p>
            <Code>{`environment:
  instance_type: t3.micro
  estimated_cost: "$0.01"
  aws_services:
    - ec2`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4 mt-8">deliverables block (optional)</h3>
            <div className="border border-[#1E293B] mb-4">
              <div className="px-4">
                <Field name="path"        type="string" required desc="Absolute path on the instance. e.g. /etc/systemd/system/myapp.service" />
                <Field name="description" type="string" required desc="What the file must contain. Written as a checklist — each item maps to a validation check." />
              </div>
            </div>
          </Section>

          {/* Briefing & Evidence */}
          <Section id="briefing" label="Briefing & Evidence">
            <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
              The <code className="font-mono text-[#38BDF8] text-xs">briefing:</code> block gives incident and challenge labs their operational context. It replaces the description text with a structured scenario that reads like a real alert. The <code className="font-mono text-[#38BDF8] text-xs">evidence:</code> block (top-level, separate from briefing) adds flavour cards — PagerDuty alerts, Slack messages, tickets, and notes.
            </p>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">briefing fields</h3>
            <div className="border border-[#1E293B] mb-8">
              <div className="px-4">
                <Field name="severity"  type="enum"   required desc="sev-1 (service down, production impact) · sev-2 (degraded) · sev-3 (non-critical) · sev-4 (no immediate impact / training task)" />
                <Field name="impact"    type="string" required desc="One-line blast radius. e.g. Web service returning 500 on all endpoints." />
                <Field name="title"     type="string" required desc="Short alert title. e.g. Permission Chaos Detected." />
                <Field name="narrative" type="string" required desc="3–5 sentences of operational context. What broke, when, what is affected, what the student needs to do." />
              </div>
            </div>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">evidence items</h3>
            <div className="border border-[#1E293B] mb-6">
              <div className="px-4 py-2 bg-[#0F172A] text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-[#1E293B]">
                Evidence types
              </div>
              <div className="px-4">
                <Field name="pagerduty" type="type" desc="Renders as a PagerDuty alert card." />
                <Field name="slack"     type="type" desc="Renders as a Slack message card." />
                <Field name="email"     type="type" desc="Renders as an email message." />
                <Field name="note"      type="type" desc="Renders as a plain ticket or note." />
              </div>
            </div>
            <Code>{`briefing:
  severity: sev-2
  impact: Web service returning 500 on all endpoints
  title: Permission Chaos Detected
  narrative: |
    A junior engineer ran sudo chown -R root:root /var/www/html.
    nginx runs as www-data and can no longer read any files.
    Every request returns 500. Fix permissions — no restarts until you
    understand what broke.

evidence:
  - type: pagerduty
    title: "P2: nginx 500 on all requests"
    content: |
      CRITICAL: prod-web-01 — all requests returning 500
      nginx error log: Permission denied reading /var/www/html
  - type: slack
    title: "#ops-alerts"
    content: |
      [automated] nginx 500 rate: 100% — prod-web-01
      First seen: 14:23 UTC`}</Code>
          </Section>

          {/* Validation */}
          <Section id="validation" label="Validation Checks">
            <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
              Checks run against the live EC2 instance when the student clicks Submit. Every check in the array must pass (or at least one with <code className="font-mono text-[#38BDF8] text-xs">strategy: any</code>) for the lab to be marked complete. Transient failures are retried up to 3 times automatically.
            </p>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4">Validation Block Structure</h3>
            <Code>{`validation:
  strategy: all        # all checks must pass (default). use 'any' for alternatives.
  default_timeout_seconds: 5
  checks:
    - id: nginx-running
      name: Nginx Running
      type: output_matches
      cmd: systemctl is-active nginx
      contains: active
      failure_hint: Run 'sudo systemctl restart nginx' and check 'journalctl -xe'`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4 mt-8">Check Fields</h3>
            <div className="border border-[#1E293B] mb-8">
              <div className="px-4">
                <Field name="id"            type="string"  required desc="Unique identifier within the lab (kebab-case). Shown in validation results." />
                <Field name="name"          type="string"  required desc="Human-readable display name shown while the check runs." />
                <Field name="type"          type="enum"    required desc="Check type: output_matches · ssh · http_get · multi_check" />
                <Field name="cmd"           type="string"           desc="Shell command to run via SSH (output_matches, ssh)." />
                <Field name="url"           type="string"           desc="HTTP URL to request (http_get). Supports {{TEMPLATE_VAR}} substitution." />
                <Field name="contains"      type="string"           desc="Output must contain this substring (output_matches)." />
                <Field name="pattern"       type="string"           desc="Output must match this regex (output_matches). Takes priority over contains." />
                <Field name="value"         type="string"           desc="Output must equal this exactly, trimmed (output_matches). Lowest priority." />
                <Field name="expect_status" type="integer"          desc="Expected HTTP status code (http_get). Default: any 2xx." />
                <Field name="operator"      type="enum"             desc="multi_check logic: all (default) or any." />
                <Field name="checks"        type="Check[]"          desc="Sub-checks for multi_check type." />
                <Field name="failure_hint"  type="string"           desc="Shown to the student when this check fails. Write it as a command to run, not a description of what is wrong." />
              </div>
            </div>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-3">output_matches</h3>
            <p className="text-slate-400 font-sans text-sm mb-4">
              Runs <code className="font-mono text-[#38BDF8] text-xs">cmd</code> via SSH. Passes if exit code is 0 and the output satisfies the match criteria. Covers 90% of validation needs.
            </p>
            <Code>{`- id: nginx-running
  name: Nginx Running
  type: output_matches
  cmd: systemctl is-active nginx
  contains: active
  failure_hint: Run 'sudo systemctl restart nginx' and check 'journalctl -xe'

- id: disk-below-90
  name: Disk Below 90%
  type: output_matches
  cmd: df / | awk 'NR==2 {gsub("%",""); print ($5 < 90) ? "ok" : "full"}'
  value: ok
  failure_hint: Run 'du -sh /* 2>/dev/null | sort -h' to find what is using space`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-3 mt-8">ssh</h3>
            <p className="text-slate-400 font-sans text-sm mb-4">
              Runs <code className="font-mono text-[#38BDF8] text-xs">cmd</code> via SSH. Passes if exit code is 0. Output is not checked — use for existence checks where you only care whether the command succeeds.
            </p>
            <Code>{`- id: config-exists
  name: Config File Exists
  type: ssh
  cmd: test -f /etc/myapp/config.yaml
  failure_hint: Create the config file at /etc/myapp/config.yaml

- id: service-unit-present
  name: Unit File Written
  type: ssh
  cmd: test -f /etc/systemd/system/myapp.service
  failure_hint: Write the unit file to /etc/systemd/system/myapp.service`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-3 mt-8">http_get</h3>
            <p className="text-slate-400 font-sans text-sm mb-4">
              Makes an HTTP GET to <code className="font-mono text-[#38BDF8] text-xs">url</code>. Passes if the response is 2xx, or matches <code className="font-mono text-[#38BDF8] text-xs">expect_status</code> if set.
            </p>
            <Code>{`- id: app-responding
  name: App HTTP Responding
  type: http_get
  url: "http://{{EC2_IP}}:8080/health"
  failure_hint: Check the app with 'systemctl status myapp' and 'journalctl -u myapp -n 50'

- id: auth-enforced
  name: Auth Required on Admin Route
  type: http_get
  url: "http://{{EC2_IP}}:8080/admin"
  expect_status: 401`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-3 mt-8">multi_check</h3>
            <p className="text-slate-400 font-sans text-sm mb-4">
              Runs a list of sub-checks. With <code className="font-mono text-[#38BDF8] text-xs">operator: all</code> every sub-check must pass. With <code className="font-mono text-[#38BDF8] text-xs">operator: any</code> at least one must pass.
            </p>
            <Code>{`- id: stack-healthy
  name: Full Stack Healthy
  type: multi_check
  operator: all
  checks:
    - id: nginx-active
      name: Nginx Active
      type: output_matches
      cmd: systemctl is-active nginx
      contains: active
    - id: app-active
      name: App Active
      type: output_matches
      cmd: systemctl is-active myapp
      contains: active`}</Code>

            <h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-4 mt-8">Writing Good Checks</h3>
            <div className="space-y-3 text-sm font-sans text-slate-400">
              <div className="flex gap-3">
                <span className="text-[#22C55E] font-mono shrink-0 mt-0.5">✓</span>
                <span>Test the outcome, not the method. <code className="font-mono text-[#38BDF8] text-xs">systemctl is-active nginx</code> is better than checking if a config file was written.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#22C55E] font-mono shrink-0 mt-0.5">✓</span>
                <span>Reduce output to something predictable — pipe through <code className="font-mono text-[#38BDF8] text-xs">awk</code> to produce <code className="font-mono text-[#38BDF8] text-xs">ok</code> / <code className="font-mono text-[#38BDF8] text-xs">fail</code>, or use <code className="font-mono text-[#38BDF8] text-xs">grep -c</code> to produce a count.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#22C55E] font-mono shrink-0 mt-0.5">✓</span>
                <span>Write <code className="font-mono text-[#38BDF8] text-xs">failure_hint</code> as a command to run, not a description of what is wrong.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#EF4444] font-mono shrink-0 mt-0.5">✗</span>
                <span>Do not use <code className="font-mono text-[#38BDF8] text-xs">ps aux | grep myapp</code> — grep matches itself. Use <code className="font-mono text-[#38BDF8] text-xs">systemctl is-active</code> or <code className="font-mono text-[#38BDF8] text-xs">pgrep -f</code>.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#EF4444] font-mono shrink-0 mt-0.5">✗</span>
                <span>Do not hardcode IPs. Use <code className="font-mono text-[#38BDF8] text-xs">{"{{EC2_IP}}"}</code> in http_get URLs.</span>
              </div>
            </div>
          </Section>

          {/* Hints */}
          <Section id="hints" label="Hint System">
            <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
              Every lab requires three hint levels. The levels are progressive — each reveals more than the last. Good hints are the difference between a student who learns and one who rage-quits.
            </p>
            <div className="space-y-3 mb-6">
              {[
                ["Level 1", "Directional", "Points the student at the right area without giving commands. What should they be looking at? What questions should they be asking? Shown automatically on lab load by default."],
                ["Level 2", "Specific",    "Names the relevant commands and flags. Still expects the student to piece together the fix from the hints."],
                ["Level 3", "Full walkthrough", "Every command, in order, with a one-line explanation of why each step is necessary. A student who is completely stuck should be able to follow this to completion."],
              ].map(([level, label, desc]) => (
                <div key={level} className="flex gap-4 border border-[#1E293B] p-4 font-mono">
                  <div className="w-16 shrink-0">
                    <span className="text-[#38BDF8] text-xs font-bold">{level}</span>
                    <p className="text-slate-600 text-[10px] mt-0.5">{label}</p>
                  </div>
                  <p className="text-slate-400 font-sans text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <Code>{`hint_policy: show_level_1_automatically
hints:
  - level: 1
    text: |
      Something swept ownership across a directory it should not have touched.
      Find out which directory is affected and what nginx needs to read it.

  - level: 2
    text: |
      Check what nginx is trying to read:
        sudo journalctl -u nginx --since "5 min ago"
        ls -la /var/www/html

      nginx runs as www-data. Fix ownership:
        sudo chown -R www-data:www-data /var/www/html
        sudo chmod 755 /var/www/html

  - level: 3
    text: |
      # Confirm the problem
      sudo journalctl -u nginx --since "5 min ago" | grep "Permission denied"
      ls -la /var/www/html   # should show root:root — that is wrong

      # Fix ownership
      sudo chown -R www-data:www-data /var/www/html
      sudo chmod 755 /var/www/html
      sudo find /var/www/html -type f -exec chmod 644 {} \\;

      # Verify nginx can now read the files
      sudo nginx -t
      curl -s -o /dev/null -w "%{http_code}" http://localhost`}</Code>
          </Section>

          {/* Terraform Modules */}
          <Section id="modules" label="Terraform Modules">
            <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
              The <code className="font-mono text-[#38BDF8] text-xs">terraform_module</code> field tells the platform which infrastructure template to provision for your lab. Choose the module that matches your scenario — you do not write or modify Terraform.
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "labs/linux-ec2",
                  status: "stable",
                  color: "#22C55E",
                  outputs: "EC2_IP, INSTANCE_ID",
                  desc: "Single Ubuntu 22.04 EC2 instance (t3.micro). Connects via Cloudflare Tunnel. Used for all Linux track labs. The scenario_id determines what is broken on the instance.",
                },
                {
                  name: "labs/docker-ec2",
                  status: "planned",
                  color: "#F59E0B",
                  outputs: "EC2_IP, INSTANCE_ID",
                  desc: "EC2 instance with Docker and Docker Compose pre-installed. Broken container configurations are injected via userdata. For Containers track labs.",
                },
                {
                  name: "labs/kubernetes-eks",
                  status: "planned",
                  color: "#F59E0B",
                  outputs: "CLUSTER_ENDPOINT, CLUSTER_NAME",
                  desc: "EKS cluster with a pre-configured broken workload. For Kubernetes track labs. Note: EKS provisions take 8–12 minutes.",
                },
              ].map(({ name, status, color, outputs, desc }) => (
                <div key={name} className="border border-[#1E293B] bg-[#0F172A] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <code className="text-[#38BDF8] font-mono text-xs">{name}</code>
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border"
                      style={{ color, borderColor: `${color}40` }}>
                      {status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm font-sans leading-relaxed mb-2">{desc}</p>
                  <p className="text-slate-600 font-mono text-[10px]">Template variables: {outputs}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Full Example */}
          <Section id="example" label="Full Example">
            <p className="text-slate-400 font-sans text-sm mb-6">
              A complete incident-mode lab — all required fields, a briefing, evidence cards, deliverables, and validation checks:
            </p>
            <Code>{`schema_version: 1

metadata:
  version: 1.0.0
  author: your-name
  reviewed_by: []
  last_updated: 2026-06-14

id: linux-disk-full
title: "Disk Full: Production Filesystem Saturated"
description: >
  The root filesystem is at 100%. Every write is failing.
  Find what consumed the disk, clear space, and restore the service.

track: linux
module: linux-storage
sort_order: 80
difficulty: intermediate
engineer_level: L2
mode: incident

tags:
  - linux
  - disk
  - storage
  - troubleshooting
  - incident

estimated_minutes: 45
timeout_minutes: 90
terraform_module: labs/linux-ec2
scenario_id: disk-full

environment:
  instance_type: t3.micro
  estimated_cost: "$0.01"
  aws_services:
    - ec2

prerequisites:
  - linux-filesystem-anatomy

briefing:
  severity: sev-1
  impact: Service down — production impact
  title: Filesystem 100% — write errors
  narrative: |
    The production web server is returning 500 errors on every request.
    The app cannot write logs or temp files. The root filesystem hit 100%.
    Identify what consumed the disk, clear space, and restore the service.

evidence:
  - type: pagerduty
    title: "P1: Filesystem 100% — write errors"
    content: |
      CRITICAL: / at 100% on prod-web-01
      App is throwing ENOSPC on every write
      Services failing: nginx, app, cron
  - type: slack
    title: "#ops-alerts"
    content: |
      [automated] ALERT: prod-web-01 disk usage 100%
      First seen: 14:23 UTC — still firing

objectives:
  - Identify what is consuming disk space
  - Remove the bloat without deleting production data
  - Restore service without a restart

success_criteria:
  - df / shows less than 90% used
  - nginx is active and responding
  - App is responding on port 8080

deliverables:
  - path: /tmp/disk-cleanup.log
    description: |
      A log of what you found and what you removed:
        - Output of du -sh showing the bloat
        - Commands run to free space
        - df -h after cleanup

hint_policy: show_level_1_automatically
hints:
  - level: 1
    text: |
      Something wrote a lot of data somewhere.
      Find out what is large. Find out what is growing.

  - level: 2
    text: |
      df -h — which filesystem is full?
      sudo du -sh /* 2>/dev/null | sort -h — what is largest?
      sudo journalctl --disk-usage — are logs the culprit?
      ls -lhS /tmp /var/log /var/cache — spot large files

  - level: 3
    text: |
      df -h
      sudo du -sh /* 2>/dev/null | sort -h
      sudo journalctl --vacuum-size=200M
      sudo find /var/log -name "*.gz" -delete
      sudo apt-get clean
      df -h
      sudo systemctl restart nginx

validation:
  strategy: all
  default_timeout_seconds: 5
  checks:
    - id: disk-below-90
      name: Disk Below 90%
      type: output_matches
      cmd: df / | awk 'NR==2 {gsub("%",""); print ($5 < 90) ? "ok" : "full"}'
      value: ok
      failure_hint: Run 'du -sh /* 2>/dev/null | sort -h' to find what is using space

    - id: nginx-running
      name: Nginx Running
      type: output_matches
      cmd: systemctl is-active nginx
      contains: active
      failure_hint: Start nginx with 'sudo systemctl start nginx'

    - id: app-responding
      name: App HTTP Responding
      type: http_get
      url: "http://{{EC2_IP}}:8080/health"
      failure_hint: Check app logs with 'journalctl -u myapp -n 50'

completion_message: |
  A full disk silently kills services that try to write.
  You can now isolate the cause, clean safely, and verify the fix.
  Set up disk monitoring so you see this before it hits 100%.`}</Code>
          </Section>

          {/* Submit */}
          <Section id="submit" label="Submit a Lab">
            <p className="text-slate-400 font-sans text-sm leading-relaxed mb-6">
              Good labs come from real incidents. If you have been through an outage and want to turn it into a lab, here is the process:
            </p>

            {/* Repo link */}
            <a
              href="https://github.com/devleep-platform/labs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 border border-[#38BDF8]/30 bg-[#38BDF8]/5 p-4 mb-8 hover:border-[#38BDF8] transition-colors group"
            >
              <div className="flex-1">
                <p className="text-[#38BDF8] font-mono text-xs font-bold">github.com/devleep-platform/labs</p>
                <p className="text-slate-500 font-mono text-[10px] mt-0.5">Public repository — fork it, write your YAML, open a PR</p>
              </div>
              <span className="text-slate-600 group-hover:text-[#38BDF8] font-mono text-xs transition-colors">→</span>
            </a>

            <div className="space-y-3 mb-8">
              {[
                ["1. Write the YAML",          "Follow the schema on this page. Use an existing lab in the repo as a starting point. Declare schema_version: 1 at the top. Place your file at labs/<track>/<lab-id>.yaml — the filename must match the id field."],
                ["2. Choose the right module",  "Pick the terraform_module that matches your scenario (labs/linux-ec2 for most Linux labs). The scenario_id field determines what gets broken on the instance — check the README for available scenario IDs."],
                ["3. Write all three hints",    "Level 1 directional, Level 2 specific commands, Level 3 full walkthrough. A lab without a complete Level 3 will be sent back immediately."],
                ["4. Write tight checks",       "Every validation check must test the outcome, not the method. Verify your commands produce consistent, predictable output before submitting."],
                ["5. Open a pull request",      "Fork the labs repo and open a PR. Automated validation runs within 60 seconds and posts a comment with the results. Fix any errors, push a new commit, and validation re-runs automatically."],
                ["6. Review and go live",       "The Devloop team reviews the scenario, hints, and checks. On approval and merge, the lab syncs to the platform and appears in the catalog within 5 minutes."],
              ].map(([title, desc]) => (
                <div key={title} className="border border-[#1E293B] p-4 flex gap-4">
                  <span className="text-[#38BDF8] font-mono text-xs shrink-0 mt-0.5">{(title as string).split(".")[0]}.</span>
                  <div>
                    <p className="text-white font-mono text-xs font-bold mb-1">{(title as string).split(". ")[1]}</p>
                    <p className="text-slate-400 font-sans text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border border-[#1E293B] bg-[#0F172A] p-4 font-mono text-xs text-slate-500">
              <span className="text-[#F59E0B]">Note:</span>
              {" "}You do not need access to the platform codebase, Terraform, or the database. Write the YAML and open a PR — the team handles the rest.
            </div>
          </Section>

        </div>
      </div>
    </DarkAppShell>
  );
}
