import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Track",
  description: "Hands-on DevOps learning track with real incident labs on AWS infrastructure.",
};

export default function TrackSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
