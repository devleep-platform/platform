import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track",
  robots: { index: false, follow: false },
};

export default function TrackSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
