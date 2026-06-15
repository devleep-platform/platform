import type { Metadata } from "next";
import LabPageClient from "./LabPageClient";

export function generateStaticParams() {
  return [{ slug: "__shell" }];
}

export const metadata: Metadata = {
  title: "Lab",
  description: "Hands-on DevOps incident lab on real infrastructure. SSH into a broken system and fix it.",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <LabPageClient />;
}
