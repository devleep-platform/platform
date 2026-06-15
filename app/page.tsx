"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Terminal, Play, Server, Activity,
  CheckCircle2, ChevronRight, AlertTriangle,
  Cpu, HardDrive, Network, Database, ShieldAlert,
  Cloud
} from 'lucide-react';

// --- CUSTOM ANIMATIONS & STYLES ---
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  
  .font-sans { font-family: 'Inter', sans-serif; letter-spacing: -0.02em; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  
  .scanline {
    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
    background-size: 100% 4px;
    position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 10; pointer-events: none;
  }

  .grid-bg {
    background-image: 
      linear-gradient(to right, #0F172A 1px, transparent 1px),
      linear-gradient(to bottom, #0F172A 1px, transparent 1px);
    background-size: 24px 24px;
  }

  @keyframes stream {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  .animate-stream { animation: stream 20s linear infinite; }
  
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .animate-blink { animation: blink 1s step-end infinite; }
`;

const ALL_LOGS = [
  "Jun 12 02:47:15 systemd[1]: Starting nginx.service...",
  "Jun 12 02:47:16 nginx[1234]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)",
  "Jun 12 02:47:17 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE",
  "Jun 12 02:47:18 systemd[1]: nginx.service: Failed with result 'exit-code'.",
  "Jun 12 02:47:18 systemd[1]: Failed to start nginx.service.",
  "Jun 12 02:47:19 kernel: Out of memory: Killed process 1452 (python3)",
  "Jun 12 02:47:20 dockerd[892]: Error response from daemon: No space left on device",
  "Jun 12 02:47:21 kubelet[1023]: Node disk pressure detected. Evicting pods.",
];

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const stream = () => {
      setLogs([]);
      ALL_LOGS.forEach((log, i) => {
        const t = setTimeout(() => {
          setLogs(prev => [...prev, log]);
        }, i * 750);
        timers.push(t);
      });
      const reset = setTimeout(() => stream(), ALL_LOGS.length * 750 + 2500);
      timers.push(reset);
    };

    stream();
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#070B11] text-slate-300 font-sans selection:bg-[#38BDF8] selection:text-[#070B11] grid-bg overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Top Nav - Minimal Ops Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#070B11]/90 backdrop-blur border-b border-[#0F172A] font-mono text-xs uppercase tracking-wider">
        <div className="flex justify-between items-center h-12 px-4 sm:px-6">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icons/favicon-96x96.png" alt="Devleep" width={24} height={24} className="rounded-sm" />
              <span className="text-white font-bold">DEVLEEP_OPS</span>
            </Link>
            <div className="hidden sm:flex space-x-4 text-slate-500">
              <Link href="/catalog" className="hover:text-slate-300">Incidents</Link>
              <Link href="/docs" className="hover:text-slate-300">Docs</Link>
              <Link href="/community" className="hover:text-slate-300">Community</Link>
              <Link href="/about" className="hover:text-slate-300">About</Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="bg-[#38BDF8] text-[#070B11] px-3 py-1 font-bold hover:bg-[#7DD3FC] transition-colors"
            >
              AUTH // LOGIN
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - Full Viewport */}
      <section className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto flex flex-col justify-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Side - Incident Dashboard */}
          <div className="order-2 lg:order-1 relative group">
            <div className="absolute -inset-0.5 bg-[#EF4444] opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative bg-[#0F172A] border border-[#EF4444]/50 shadow-2xl overflow-hidden flex flex-col">
              
              {/* Dashboard Header */}
              <div className="bg-[#EF4444] text-[#070B11] px-3 py-1.5 flex justify-between items-center font-mono text-xs font-bold uppercase">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} />
                  [SEV-1] CRITICAL INCIDENT ACTIVE
                </div>
                <div className="flex items-center gap-2">
                  <span>T-MINUS 00:14:22</span>
                  <div className="w-1.5 h-1.5 bg-[#070B11] rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 border-b border-[#1E293B] bg-[#070B11]">
                <div className="p-3 border-r border-[#1E293B]">
                  <div className="text-slate-500 font-mono text-[10px] uppercase mb-1 flex justify-between">CPU <Cpu size={10}/></div>
                  <div className="text-2xl font-bold text-[#EF4444] font-mono">100%</div>
                </div>
                <div className="p-3 border-r border-[#1E293B]">
                  <div className="text-slate-500 font-mono text-[10px] uppercase mb-1 flex justify-between">DISK <HardDrive size={10}/></div>
                  <div className="text-2xl font-bold text-[#EF4444] font-mono">98.2%</div>
                </div>
                <div className="p-3">
                  <div className="text-slate-500 font-mono text-[10px] uppercase mb-1 flex justify-between">STATUS <Activity size={10}/></div>
                  <div className="text-xl font-bold text-[#F59E0B] font-mono mt-1">DEGRADED</div>
                </div>
              </div>

              {/* Terminal Area */}
              <div ref={terminalRef} className="p-4 bg-[#070B11] relative h-[300px] overflow-y-auto font-mono text-xs sm:text-sm">
                <div className="scanline pointer-events-none"></div>
                <div className="space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className={`${log.includes('failed') || log.includes('Error') || log.includes('Killed') ? 'text-[#EF4444]' : 'text-slate-400'}`}>
                      {log}
                    </div>
                  ))}
                  {logs.length > 0 && (
                    <div className="text-[#38BDF8] pt-2">root@prod-api-01:~# <span className="w-2 h-4 bg-[#38BDF8] inline-block align-middle animate-blink"></span></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Copy */}
          <div className="order-1 lg:order-2 space-y-8">
            <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.05]">
              Real DevOps Labs. <br />
              <span className="text-[#38BDF8]">Real Infrastructure.</span>
            </h1>
            
            <div className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
              <p className="mb-4 text-white">Every other platform teaches commands.</p>
              <p>We teach judgment.</p>
              <p className="mt-4">When production breaks at 2:47 AM, you don’t get a tutorial. You get a problem. And a terminal.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/auth/register"
                className="bg-[#38BDF8] text-[#070B11] font-bold px-6 py-4 flex items-center justify-center gap-3 hover:bg-[#7DD3FC] transition-all uppercase tracking-wide"
              >
                <Server size={18} /> Connect AWS Account
              </Link>
              <Link
                href="/catalog"
                className="border border-[#1E293B] text-slate-300 bg-[#0F172A] font-bold px-6 py-4 flex items-center justify-center gap-3 hover:bg-[#1E293B] hover:text-white transition-all uppercase tracking-wide"
              >
                <Play size={18} /> Browse Incidents
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm font-mono text-slate-500 mt-8">
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#22C55E]" /> Runs in YOUR AWS</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#22C55E]" /> Real EC2 Infra</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#22C55E]" /> Free forever</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#22C55E]" /> No credit card</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITION TIMELINE */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-[#EF4444]"></div>
        <div className="font-mono text-xs text-[#EF4444] border border-[#EF4444] px-3 py-1 bg-[#EF4444]/10 mb-2">02:47 ALERT_TRIGGERED</div>
        <div className="w-px h-8 bg-[#EF4444]"></div>
        <div className="font-mono text-xs text-slate-500 border border-[#1E293B] px-3 py-1 bg-[#0F172A] mb-2">02:49 SSH_ACCESSED</div>
        <div className="w-px h-8 bg-[#1E293B]"></div>
        <div className="font-mono text-xs text-slate-500 border border-[#1E293B] px-3 py-1 bg-[#0F172A] mb-2">02:53 ROOT_CAUSE_FOUND</div>
        <div className="w-px h-16 bg-gradient-to-b from-[#1E293B] to-transparent"></div>
      </div>

      {/* INCIDENT SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#EF4444]/5 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Copy */}
          <div className="mb-12">
            <div className="font-mono text-[10px] text-[#EF4444] uppercase tracking-widest mb-5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
              INCIDENT_ACTIVE
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-[1.05] mb-6">
              The pager fires.<br />
              <span className="text-slate-500">You&apos;re the one who picks up.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              No runbook covers this. No senior is online. Just you, a terminal, and something broken in ways you haven&apos;t seen before.
            </p>
          </div>

          {/* Terminal panel */}
          <div className="border border-[#EF4444]/20 bg-[#070B11] overflow-hidden relative shadow-2xl shadow-[#EF4444]/5">
            <div className="scanline pointer-events-none" />

            {/* Title bar */}
            <div className="border-b border-[#1E293B] px-4 py-2.5 flex items-center justify-between bg-[#0F172A]">
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/20" />
                </div>
                <span className="text-slate-500">prod-api-01.internal — SSH session</span>
              </div>
              <div className="font-mono text-[10px] text-[#EF4444] flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
                SEV-1 ACTIVE // 3 engineers paged
              </div>
            </div>

            {/* Two panes */}
            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]">

              {/* Left — service status */}
              <div className="p-6 font-mono text-xs space-y-5">
                <div>
                  <span className="text-slate-600">root@prod-api-01:~#</span>
                  <span className="text-slate-300 ml-2">systemctl --failed</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "nginx.service",      detail: "Failed with result 'exit-code'" },
                    { name: "postgresql.service", detail: "Failed with result 'signal'" },
                    { name: "docker.service",     detail: "Start request repeated too quickly" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-start gap-3">
                      <span className="text-[#EF4444] mt-0.5">✗</span>
                      <div>
                        <div className="text-white">{s.name}</div>
                        <div className="text-[#EF4444]/70 text-[10px] mt-0.5">{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#1E293B] pt-4 space-y-2">
                  <div>
                    <span className="text-slate-600">root@prod-api-01:~#</span>
                    <span className="text-slate-300 ml-2">df -h</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-[10px] text-slate-600 uppercase tracking-wider">
                    <span>Filesystem</span><span>Size</span><span>Used</span><span>Avail</span><span>Use%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-[11px]">
                    <span className="text-slate-400">/dev/xvda1</span>
                    <span className="text-slate-400">99G</span>
                    <span className="text-slate-400">99G</span>
                    <span className="text-[#EF4444]">0</span>
                    <span className="text-[#EF4444] font-bold">100%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[#38BDF8]">root@prod-api-01:~#</span>
                  <span className="w-2 h-3.5 bg-[#38BDF8] inline-block align-middle ml-1 animate-blink" />
                </div>
              </div>

              {/* Right — live log stream */}
              <div className="p-6 font-mono text-[11px] space-y-1.5">
                <div className="mb-3">
                  <span className="text-slate-600">root@prod-api-01:~#</span>
                  <span className="text-slate-300 ml-2">journalctl -f --since &quot;5 min ago&quot;</span>
                </div>
                {[
                  { t: "02:47:01", msg: "kernel: EXT4-fs error (device xvda1): No space left on device", err: true },
                  { t: "02:47:02", msg: "dockerd[892]: Error response from daemon: no space left on device", err: true },
                  { t: "02:47:03", msg: "nginx[2201]: [emerg] bind() to 0.0.0.0:80 failed (98: Address in use)", err: true },
                  { t: "02:47:04", msg: "systemd[1]: nginx.service: Failed with result 'exit-code'", err: true },
                  { t: "02:47:05", msg: "postgres[3341]: FATAL: could not write to lock file", err: true },
                  { t: "02:47:06", msg: "kernel: Out of memory: Killed process 4521 (node) total-vm:1.2G", err: true },
                  { t: "02:47:07", msg: "systemd[1]: docker.service: Start request repeated too quickly", err: true },
                  { t: "02:47:08", msg: "audit[1]: AVC apparmor=DENIED operation=mknod profile=docker", err: false },
                  { t: "02:47:09", msg: "kubelet[1023]: Node condition DiskPressure set to True", err: true },
                  { t: "02:47:10", msg: "systemd[1]: Reached target basic.system — awaiting recovery", err: false },
                ].map((log, i) => (
                  <div key={i} className={log.err ? "text-[#EF4444]/80" : "text-slate-600"}>
                    <span className="text-slate-700 mr-2 select-none">{log.t}</span>{log.msg}
                  </div>
                ))}
                <div className="text-slate-700 pt-1">
                  <span className="mr-2">02:47:11</span>
                  <span className="animate-blink">▌</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom line */}
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-slate-500 font-mono text-sm">
              No hints. No walkthrough. Either you fix it or you don&apos;t.
            </p>
            <Link href="/catalog" className="font-mono text-xs text-[#38BDF8] hover:underline flex items-center gap-1 shrink-0">
              Browse incidents <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE DIAGRAM SECTION (How it works) */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 border-l-4 border-[#38BDF8] pl-4">
            <h2 className="text-xl font-mono font-bold text-white uppercase">SYS_ARCH // Provisioning Flow</h2>
            <p className="text-slate-500 font-mono mt-2">Connecting your account. Deploying the chaos.</p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 font-mono text-sm relative">
            
            {/* Connecting lines for desktop */}
            <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-px bg-[#1E293B] -z-10 -translate-y-1/2"></div>

            {/* Node 1 */}
            <div className="bg-[#0F172A] border border-[#1E293B] p-6 w-full lg:w-64 text-center hover:border-[#38BDF8] transition-colors group">
              <Cloud className="mx-auto mb-4 text-slate-500 group-hover:text-[#38BDF8]" size={32} />
              <div className="text-white font-bold mb-2">AWS Account</div>
              <div className="text-xs text-slate-500">Cross-Account IAM Role created by you.</div>
            </div>

            <ChevronRight className="hidden lg:block text-[#1E293B]" size={24} />
            <div className="lg:hidden w-px h-8 bg-[#1E293B]"></div>

            {/* Node 2 */}
            <div className="bg-[#0F172A] border border-[#1E293B] p-6 w-full lg:w-64 text-center hover:border-[#38BDF8] transition-colors group">
              <Cpu className="mx-auto mb-4 text-slate-500 group-hover:text-[#38BDF8]" size={32} />
              <div className="text-white font-bold mb-2">Devleep Engine</div>
              <div className="text-xs text-slate-500">Validates access, selects scenario payload.</div>
            </div>

            <ChevronRight className="hidden lg:block text-[#1E293B]" size={24} />
            <div className="lg:hidden w-px h-8 bg-[#1E293B]"></div>

            {/* Node 3 */}
            <div className="bg-[#0F172A] border border-[#EF4444] p-6 w-full lg:w-64 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-2 bg-[#EF4444] m-2 animate-pulse"></div>
              <Server className="mx-auto mb-4 text-[#EF4444]" size={32} />
              <div className="text-white font-bold mb-2">EC2 + VPC Provisioned</div>
              <div className="text-xs text-[#EF4444]">Broken state injected at boot.</div>
            </div>

            <ChevronRight className="hidden lg:block text-[#1E293B]" size={24} />
            <div className="lg:hidden w-px h-8 bg-[#1E293B]"></div>

            {/* Node 4 */}
            <div className="bg-[#38BDF8]/10 border border-[#38BDF8] p-6 w-full lg:w-64 text-center group shadow-[0_0_15px_rgba(56,189,248,0.1)]">
              <Terminal className="mx-auto mb-4 text-[#38BDF8]" size={32} />
              <div className="text-[#38BDF8] font-bold mb-2">You Fix It</div>
              <div className="text-xs text-slate-400">SSH access granted. Time starts now.</div>
            </div>
          </div>
        </div>
      </section>

      {/* REAL INFRASTRUCTURE (Visually Insane VPC Diagram) */}
      <section className="py-24 bg-[#0F172A]/30 border-y border-[#1E293B]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-block px-3 py-1 bg-[#1E293B] font-mono text-xs text-slate-400 mb-4">
              AWS_RESOURCE_MAP
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Not a Sandbox. <br/>Your Account.</h2>
            <p className="text-lg text-slate-400 font-medium">
              We don't simulate environments. We provision actual AWS resources into your account. When you fix the network partition, you're fixing real AWS routing tables.
            </p>
            <div className="p-4 bg-[#070B11] border border-[#1E293B] font-mono text-sm text-slate-500">
              <div className="flex justify-between mb-2">
                <span>Account ID:</span>
                <span className="text-white blur-[2px] select-none">1234-5678-9012</span>
              </div>
              <div className="flex justify-between">
                <span>Region:</span>
                <span className="text-[#38BDF8]">us-east-1</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 bg-[#070B11] p-6 sm:p-8 border border-[#1E293B] font-mono text-xs sm:text-sm">
            {/* VPC Wrapper */}
            <div className="border-2 border-dashed border-[#22C55E]/40 p-4 sm:p-6 relative">
              <div className="absolute -top-3 left-4 bg-[#070B11] px-2 text-[#22C55E] font-bold flex items-center gap-2">
                <Network size={14}/> vpc-devleep-lab
              </div>
              
              {/* Subnet Wrapper */}
              <div className="border border-dashed border-[#38BDF8]/40 p-4 sm:p-6 mt-4 relative">
                <div className="absolute -top-3 left-4 bg-[#070B11] px-2 text-[#38BDF8] flex items-center gap-2">
                  subnet-public-1a
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {/* EC2 Instance */}
                  <div className="border border-[#EF4444] bg-[#EF4444]/5 p-4 relative group hover:bg-[#EF4444]/10 transition-colors">
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full animate-pulse"></div>
                    <Server size={20} className="text-[#EF4444] mb-3" />
                    <div className="text-white font-bold mb-1">i-0a1b2c3d4e5f</div>
                    <div className="text-slate-500 text-[10px] uppercase">t3.micro (Ubuntu 22.04)</div>
                    <div className="mt-3 text-[#EF4444] text-[10px] border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 inline-block">
                      STATE: DEGRADED
                    </div>
                  </div>

                  {/* Security Group */}
                  <div className="border border-[#1E293B] bg-[#0F172A] p-4 text-slate-400">
                    <ShieldAlert size={20} className="mb-3 text-slate-500" />
                    <div className="text-white font-bold mb-1">sg-lab-access</div>
                    <div className="text-[10px] space-y-1 mt-2">
                      <div className="flex justify-between"><span>Inbound 22</span><span>0.0.0.0/0</span></div>
                      <div className="flex justify-between text-[#EF4444]"><span>Inbound 80</span><span>TIMEOUT</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE BROKEN SERVER SHOWCASE (Carousel of Missions) */}
      <section className="py-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="inline-block px-3 py-1 bg-[#1E293B] font-mono text-xs text-slate-400 mb-4">
              MISSION_CATALOG
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Choose your incident.</h2>
          </div>
          <Link href="/catalog" className="hidden sm:flex items-center gap-2 font-mono text-sm text-[#38BDF8] hover:underline">
            VIEW_ALL INCIDENTS <ChevronRight size={14}/>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { id: "INC-101", title: "Disk Exhaustion", cmd: "df -h", out: "/dev/xvda1  98%  /", sev: "SEV-2" },
            { id: "INC-204", title: "OOM Killer Loose", cmd: "dmesg | tail", out: "Out of memory: Killed process...", sev: "SEV-1" },
            { id: "INC-342", title: "K8s CrashLoop", cmd: "kubectl get pods", out: "payment-api  CrashLoopBackOff", sev: "SEV-1" }
          ].map((inc, i) => (
            <div key={i} className="bg-[#0F172A] border border-[#1E293B] hover:border-[#38BDF8] transition-all cursor-pointer group flex flex-col h-full">
              <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#070B11]">
                <span className="font-mono text-xs text-[#38BDF8]">{inc.id}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 border ${inc.sev === 'SEV-1' ? 'border-[#EF4444] text-[#EF4444]' : 'border-[#F59E0B] text-[#F59E0B]'}`}>
                  {inc.sev}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-white mb-4">{inc.title}</h3>
                <div className="bg-[#070B11] p-3 font-mono text-xs flex-1 border border-[#1E293B]">
                  <div className="text-slate-500">$ {inc.cmd}</div>
                  <div className="text-[#EF4444] mt-1">{inc.out}</div>
                </div>
                <div className="mt-6 font-mono text-xs text-slate-500 group-hover:text-[#38BDF8] transition-colors flex justify-between items-center">
                  <span>PROVISION_ENV</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LAB TRACKS (DevOps Skill Tree) */}
      <section className="py-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="inline-block px-3 py-1 bg-[#1E293B] font-mono text-xs text-slate-400 mb-8">
          SKILL_TREE_PROGRESSION
        </div>
        
        <div className="grid md:grid-cols-3 gap-12 font-mono text-sm">
          
          {/* Linux Node */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold bg-[#0F172A] p-3 border border-[#1E293B]">
              <Terminal size={16} className="text-[#38BDF8]"/> /linux-core
            </div>
            <ul className="border-l border-[#1E293B] ml-5 space-y-2 py-2">
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                ├── filesystem_permissions
              </li>
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                ├── systemd_services
              </li>
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                └── iptables_routing
              </li>
            </ul>
          </div>

          {/* Docker Node */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold bg-[#0F172A] p-3 border border-[#1E293B]">
              <Database size={16} className="text-[#38BDF8]"/> /containers
            </div>
            <ul className="border-l border-[#1E293B] ml-5 space-y-2 py-2">
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                ├── image_optimization
              </li>
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                ├── runtime_security
              </li>
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                └── volume_mounts
              </li>
            </ul>
          </div>

          {/* K8s Node */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold bg-[#0F172A] p-3 border border-[#1E293B]">
              <Network size={16} className="text-[#38BDF8]"/> /kubernetes
            </div>
            <ul className="border-l border-[#1E293B] ml-5 space-y-2 py-2">
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                ├── rbac_authorization
              </li>
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-slate-400 hover:text-white pl-2 cursor-pointer transition-colors">
                ├── ingress_controllers
              </li>
              <li className="relative before:absolute before:w-4 before:h-px before:bg-[#1E293B] before:-left-4 before:top-1/2 text-[#38BDF8] pl-2 cursor-pointer transition-colors font-bold">
                └── stateful_sets (active)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PRICING COST COMPARISON */}
      <section className="py-24 bg-[#0F172A]/50 border-y border-[#1E293B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-16">Resource Allocation</h2>
          
          <div className="grid sm:grid-cols-2 gap-px bg-[#1E293B] border border-[#1E293B] p-px">
            {/* Traditional */}
            <div className="bg-[#070B11] p-8 opacity-50 flex flex-col items-center">
              <div className="font-mono text-xs text-slate-500 uppercase mb-4">Traditional Training</div>
              <div className="text-4xl font-bold text-white mb-2">$299</div>
              <div className="text-slate-500 text-sm">per course</div>
              <div className="mt-8 text-xs font-mono space-y-2 text-slate-400 text-left w-full border-t border-[#1E293B] pt-4">
                <div className="flex justify-between"><span>Simulated Env</span><span>✓</span></div>
                <div className="flex justify-between"><span>Real AWS</span><span>✗</span></div>
              </div>
            </div>

            {/* Devleep */}
            <div className="bg-[#070B11] p-8 relative flex flex-col items-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#38BDF8]"></div>
              <div className="font-mono text-xs text-[#38BDF8] uppercase mb-4 font-bold">Devleep Ops Center</div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-4xl font-bold text-white">$0</div>
              </div>
              <div className="text-slate-400 text-sm">Free forever. No platform fee.</div>
              
              <div className="mt-8 text-xs font-mono space-y-2 text-slate-300 text-left w-full border-t border-[#1E293B] pt-4">
                <div className="flex justify-between"><span>Access all community labs</span><span className="text-[#38BDF8]">✓</span></div>
                <div className="flex justify-between"><span>Run in your AWS account</span><span className="text-[#38BDF8]">✓</span></div>
              </div>

              <Link
                href="/auth/register"
                className="w-full mt-8 bg-[#38BDF8] text-[#070B11] font-bold uppercase tracking-wide py-3 hover:bg-[#7DD3FC] transition-colors block text-center"
              >
                INITIALIZE
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA - Terminal */}
      <section className="h-[70vh] min-h-[500px] flex items-center justify-center relative p-4">
        <div className="absolute inset-0 scanline opacity-30"></div>
        <div className="w-full max-w-2xl bg-[#070B11] border border-[#1E293B] p-6 font-mono text-sm text-slate-300 shadow-2xl relative z-10 h-64">
          <div className="mb-4">
            <span className="text-slate-500">$</span> ssh ubuntu@incident-01.prod.internal
          </div>
          <div className="mb-4">
            <div className="text-[#EF4444] font-bold animate-pulse">ALERT</div>
            <div>Production API returning 500s.</div>
            <div>Investigate immediately.</div>
          </div>
          <div className="mt-8">
            <div className="mb-4 text-slate-500">Ready?</div>
            <Link
              href="/auth/register"
              className="bg-transparent border border-[#38BDF8] text-[#38BDF8] px-6 py-2 hover:bg-[#38BDF8] hover:text-[#070B11] transition-all font-bold uppercase"
            >
              [ START FREE ]
            </Link>
            <span className="w-2 h-4 bg-slate-500 inline-block align-middle ml-4 animate-blink"></span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1E293B] bg-[#070B11] pt-12 pb-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <Image src="/icons/favicon-96x96.png" alt="Devleep" width={22} height={22} className="rounded-sm" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">Devleep</span>
              </Link>
              <p className="text-xs text-slate-600 font-mono leading-relaxed">
                Real DevOps.<br />Real Infrastructure.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-4">Product</h4>
              <ul className="space-y-2 font-mono text-xs text-slate-600">
                <li><Link href="/catalog" className="hover:text-slate-300 transition-colors">Labs</Link></li>
                <li><Link href="/docs" className="hover:text-slate-300 transition-colors">Docs</Link></li>
                <li><Link href="/community" className="hover:text-slate-300 transition-colors">Community</Link></li>
                <li><Link href="/about" className="hover:text-slate-300 transition-colors">About</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-4">Resources</h4>
              <ul className="space-y-2 font-mono text-xs text-slate-600">
                <li><Link href="/docs" className="hover:text-slate-300 transition-colors">Documentation</Link></li>
                <li><a href="https://github.com/devleep" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">GitHub</a></li>
                <li><Link href="/community" className="hover:text-slate-300 transition-colors">Contributing</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-4">Legal</h4>
              <ul className="space-y-2 font-mono text-xs text-slate-600">
                <li><Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link></li>
                <li><Link href="/security" className="hover:text-slate-300 transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="font-mono text-[10px] text-slate-700 uppercase tracking-wider">
              SYS_STATUS: ONLINE // MIT LICENCE // COMMUNITY CONTRIBUTED
            </p>
            <p className="font-mono text-[10px] text-slate-700">
              © {new Date().getFullYear()} Devleep
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}