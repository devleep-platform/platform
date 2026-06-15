import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070B11] text-slate-300 font-mono grid-bg">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#070B11]/90 backdrop-blur border-b border-[#1E293B] text-xs uppercase tracking-wider">
        <div className="flex justify-between items-center h-12 px-4 sm:px-6 max-w-[1000px] mx-auto">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-4 text-slate-500">
            <Link href="/catalog" className="hidden sm:block hover:text-white transition-colors">Labs</Link>
            <Link href="/docs" className="hidden sm:block hover:text-white transition-colors">Docs</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/register" className="bg-[#38BDF8] text-[#070B11] px-3 py-1.5 font-bold hover:bg-[#7DD3FC] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-12">{children}</div>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] mt-24 py-6 text-center text-xs text-slate-700 uppercase tracking-widest">
        © {new Date().getFullYear()} devleep.com — MIT Licence
      </footer>
    </div>
  );
}
