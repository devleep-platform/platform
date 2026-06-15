import { apiClient } from "./client";
import type { LabEnvironment } from "./environments";

export type LabProgress = "completed" | "active" | "available";

export interface TrackLab {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: string;
  scenario_id: string | null;
  estimated_minutes: number;
  sort_order: number;
  objectives: string[];
  progress: LabProgress;
}

export interface LabTrack {
  terraform_module: string;
  environment: LabEnvironment | null;
  labs: TrackLab[];
}

export async function getLabTracks() {
  return apiClient.get<{ tracks: LabTrack[] }>("/tracks");
}
