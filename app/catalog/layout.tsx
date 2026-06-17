import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DevOps Lab Catalog",
  description: "Free hands-on DevOps labs — Linux, Docker, Kubernetes, AWS, CI/CD. Practice real incident scenarios on your own cloud infrastructure.",
  openGraph: { title: "DevOps Lab Catalog | Devleep", url: "https://devleep.com/catalog" },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
