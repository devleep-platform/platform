import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DevOps Lab",
  description: "Hands-on DevOps incident lab on real AWS infrastructure. SSH into a broken system and fix it.",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
