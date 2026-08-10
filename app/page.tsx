"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Terminal, Play, Server, Activity,
  CheckCircle2, ChevronRight, AlertTriangle,
  Cpu, HardDrive, Network, Database, ShieldAlert,
  Clock, Cloud
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

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mockLogs = [
      "Jun 12 02:47:15 systemd[1]: Starting nginx.service...",
      "Jun 12 02:47:16 nginx[1234]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)",
      "Jun 12 02:47:17 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE",
      "Jun 12 02:47:18 systemd[1]: nginx.service: Failed with result 'exit-code'.",
      "Jun 12 02:47:18 systemd[1]: Failed to start nginx.service.",
      "Jun 12 02:47:19 kernel: Out of memory: Killed process 1452 (python3)",
      "Jun 12 02:47:20 dockerd[892]: Error response from daemon: No space left on device",
      "Jun 12 02:47:21 kubelet[1023]: Node disk pressure detected. Evicting pods.",
    ];
    setLogs(mockLogs);
  }, []);

  return (
    <div className="min-h-screen bg-[#070B11] text-slate-300 font-sans selection:bg-[#38BDF8] selection:text-[#070B11] grid-bg overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Top Nav - Minimal Ops Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#070B11]/90 backdrop-blur border-b border-[#0F172A] font-mono text-xs uppercase tracking-wider">
        <div className="flex justify-between items-center h-12 px-4 sm:px-6">
          <div className="flex items-center space-x-6">
            <span className="text-white font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse"></div>
              DEVLOOP_OPS
            </span>
            <div className="hidden sm:flex space-x-4 text-slate-500">
              <span className="hover:text-slate-300 cursor-pointer">Dashboards</span>
              <span className="hover:text-slate-300 cursor-pointer">Infrastructure</span>
              <span className="hover:text-slate-300 cursor-pointer text-[#38BDF8]">Incidents [65]</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-block text-slate-500">SYS_TIME: <Clock size={12} className="inline mr-1 -mt-0.5"/>2:47 AM UTC</span>
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
              <div className="p-4 bg-[#070B11] relative h-[300px] overflow-hidden font-mono text-xs sm:text-sm">
                <div className="scanline"></div>
                <div className="space-y-1.5 text-slate-400 absolute w-full pr-4">
                  {logs.map((log, i) => (
                    <div key={i} className={`${log.includes('failed') || log.includes('Error') || log.includes('Killed') ? 'text-[#EF4444]' : 'text-slate-400'}`}>
                      {log}
                    </div>
                  ))}
                  <div className="text-[#38BDF8] pt-2">root@prod-api-01:~# <span className="w-2 h-4 bg-[#38BDF8] inline-block align-middle animate-blink"></span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Copy */}
          <div className="order-1 lg:order-2 space-y-8">
            <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.05]">
              Real DevOps. <br />
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
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#22C55E]" /> ~$0.03 per lab</div>
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

      {/* PROBLEM SECTION - Split Screen */}
      <section className="py-20 border-y border-[#1E293B] bg-[#0F172A]/50 relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Tutorials Teach Commands.<br/><span className="text-[#EF4444]">Production Demands Instincts.</span></h2>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
          {/* Left - The Illusion (Course Platform) */}
          <div className="border border-[#1E293B] bg-white rounded-lg overflow-hidden shadow-lg p-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 flex flex-col justify-center items-center text-slate-800">
            <div className="w-full max-w-sm space-y-6">
              <h3 className="font-sans font-bold text-xl text-slate-800">Lesson 17: Restarting Nginx</h3>
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Run this command to fix the issue:</p>
                <code className="bg-slate-800 text-[#22C55E] px-3 py-2 rounded block font-mono text-sm">
                  sudo systemctl restart nginx
                </code>
              </div>
              <button className="w-full bg-[#22C55E] text-white font-bold py-3 rounded shadow-sm flex justify-center items-center gap-2">
                <CheckCircle2 size={18} /> Execute & Continue
              </button>
            </div>
          </div>

          {/* Right - Reality (Real Production Incident) */}
          <div className="border border-[#EF4444]/50 bg-[#070B11] p-6 font-mono text-sm shadow-2xl relative">
            <div className="scanline"></div>

            {/* Incident header */}
            <div className="flex justify-between items-start mb-6 border-b border-[#1E293B] pb-4">
              <div>
                <div className="text-[#EF4444] font-bold text-lg">CRITICAL: API_UNREACHABLE</div>
                <div className="text-slate-500 mt-1">5 services degraded // unknown root cause</div>
              </div>
              <Activity className="text-[#EF4444] animate-pulse" />
            </div>

            {/* Service status */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between bg-[#0F172A] p-2 border border-[#1E293B]">
                <span className="text-slate-400">nginx.service</span>
                <span className="text-[#EF4444]">FAILED (Code: 1)</span>
              </div>
              <div className="flex justify-between bg-[#0F172A] p-2 border border-[#1E293B]">
                <span className="text-slate-400">/dev/xvda1 (Disk)</span>
                <span className="text-[#F59E0B]">98% FULL</span>
              </div>
            </div>

            {/* Raw terminal output */}
            <div className="bg-[#0F172A] border border-[#1E293B] p-3 text-xs mb-6">
              <span className="text-slate-500">root@prod:~#</span> journalctl -u nginx -n 1
              <div className="text-slate-300 mt-1">nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)</div>
              <div className="text-slate-500 mt-2">root@prod:~# <span className="w-1.5 h-3.5 bg-slate-500 inline-block align-middle animate-blink"></span></div>
            </div>

            {/* Validate — no hints, no AI */}
            <div className="border border-[#1E293B] bg-[#0F172A] p-4">
              <div className="text-slate-600 text-[10px] uppercase font-mono mb-3 tracking-widest">When you think you&apos;ve fixed it</div>
              <div className="w-full border border-[#22C55E] text-[#22C55E] py-2.5 flex items-center justify-center gap-2 text-xs uppercase font-bold tracking-wide">
                <CheckCircle2 size={14} /> Run Validate
              </div>
              <div className="mt-3 text-[10px] text-slate-600 text-center font-mono">
                No hints. No AI. Either it passes or it doesn&apos;t.
              </div>
            </div>
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
              <div className="text-white font-bold mb-2">Devloop Engine</div>
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
                <Network size={14}/> vpc-devloop-lab
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

            {/* Devloop */}
            <div className="bg-[#070B11] p-8 relative flex flex-col items-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#38BDF8]"></div>
              <div className="font-mono text-xs text-[#38BDF8] uppercase mb-4 font-bold">Devloop Ops Center</div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-4xl font-bold text-white">$0</div>
                <div className="text-slate-500 font-mono text-sm">+ ~$0.03</div>
              </div>
              <div className="text-slate-400 text-sm">platform fee + per lab (AWS direct)</div>
              
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
      <footer className="border-t border-[#1E293B] bg-[#070B11] py-8 font-mono text-xs text-slate-600 text-center">
        <p>SYS_STATUS: ONLINE // LICENCE: MIT // COMMUNITY CONTRIBUTED</p>
      </footer>
    </div>
  );
}