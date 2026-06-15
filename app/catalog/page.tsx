import type { Metadata } from "next";
import CatalogClient from "./CatalogClient";

export const metadata: Metadata = {
  title: "Lab Catalog",
  description: "Browse hands-on DevOps incident labs covering Linux, Docker and Kubernetes. Filter by difficulty and track. Free — runs in your own AWS account.",
};

export default function CatalogPage() {
  return <CatalogClient />;
}
