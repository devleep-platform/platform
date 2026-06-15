import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incident Catalog",
  description: "Browse DevOps incident labs — Linux, Docker, Kubernetes, and more.",
  robots: { index: false, follow: false },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
