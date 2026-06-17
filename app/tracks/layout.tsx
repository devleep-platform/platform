import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DevOps Learning Tracks",
  description: "Structured DevOps learning paths — master Linux, Docker, Kubernetes, AWS, and CI/CD through hands-on incident labs on real infrastructure.",
  openGraph: { title: "DevOps Learning Tracks | Devleep", url: "https://devleep.com/tracks" },
};

export default function TracksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

