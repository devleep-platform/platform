import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Training Tracks",
  description: "Structured learning tracks grouping labs by environment and skill progression.",
  robots: { index: false, follow: false },
};

export default function TracksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

