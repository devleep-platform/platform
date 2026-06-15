import type { Metadata } from "next";
import TracksClient from "./TracksClient";

export const metadata: Metadata = {
  title: "Training Tracks",
  description: "Structured DevOps learning tracks for Linux, Docker and Kubernetes. Each track groups related incident labs so you can practice without reprovisioning.",
};

export default function TracksPage() {
  return <TracksClient />;
}
