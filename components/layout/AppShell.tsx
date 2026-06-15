import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";

export function AppShell({
  children,
  title,
  description
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link className="flex items-center gap-2 font-semibold text-ink" href="/dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm text-white">
              DL
            </span>
            <span>Devleep Labs</span>
          </Link>
        </div>
        <AppNav variant="desktop" />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col justify-center gap-1 px-4 py-3 sm:px-6 lg:px-8">
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            {description ? <p className="text-sm text-muted">{description}</p> : null}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <AppNav variant="mobile" />
    </div>
  );
}
