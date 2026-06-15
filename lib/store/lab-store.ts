"use client";

import { create } from "zustand";
import type { LabInstance, LabStatus, ValidationResult, LabTemplate } from "@/lib/types";

type LabState = {
  instance: LabInstance | null;
  lab: LabTemplate | null;
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  selectedHint: number;
  
  // Actions
  initializeLab: (labSlug: string, token: string) => Promise<void>;
  setStatus: (status: LabStatus) => void;
  selectHint: (index: number) => void;
  endLab: (token: string) => Promise<void>;
  runValidation: (token: string) => Promise<void>;
  updateValidationResults: (results: ValidationResult[]) => void;
};

export const useLabStore = create<LabState>((set, get) => ({
  instance: null,
  lab: null,
  sessionId: null,
  loading: false,
  error: null,
  selectedHint: 0,

  initializeLab: async (labSlug: string, token: string) => {
    set({ loading: true, error: null });
    try {
      // Step 1: Fetch lab definition from API
      const labResponse = await fetch(`/api/labs/${labSlug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!labResponse.ok) {
        throw new Error(`Failed to fetch lab: ${labResponse.statusText}`);
      }

      const { lab } = await labResponse.json();

      // Step 2: Start lab session
      const startResponse = await fetch(`/api/labs/${labSlug}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ labSlug })
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start lab: ${startResponse.statusText}`);
      }

      const { sessionId, websocketUrl, createdAt } = await startResponse.json();

      // Step 3: Create initial instance with real data
      const instance: LabInstance = {
        id: sessionId,
        templateId: lab.id,
        status: "provisioning",
        startedAt: createdAt,
        ttlSeconds: (lab.timeout_minutes || 120) * 60,
        websocketUrl: websocketUrl,
        validationResults: []
      };

      set({
        instance,
        lab,
        sessionId,
        loading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ 
        error: message, 
        loading: false 
      });
      throw error;
    }
  },

  setStatus: (status) =>
    set((state) => {
      if (!state.instance) return state;
      return {
        instance: {
          ...state.instance,
          status
        }
      };
    }),

  selectHint: (index) => set({ selectedHint: index }),

  endLab: async (token: string) => {
    const { sessionId } = get();
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/destroy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to end lab: ${response.statusText}`);
      }

      set((state) => {
        if (!state.instance) return state;
        return {
          instance: {
            ...state.instance,
            status: "completed" as LabStatus,
            ttlSeconds: 0
          }
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ error: message });
      throw error;
    }
  },

  runValidation: async (token: string) => {
    const { sessionId, instance } = get();
    if (!sessionId || instance?.status === "validating") return;

    try {
      set((state) => {
        if (!state.instance) return state;
        return {
          instance: {
            ...state.instance,
            status: "validating" as LabStatus
          }
        };
      });

      const response = await fetch(`/api/sessions/${sessionId}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      // Results will come via WebSocket, but API call confirms it's queued
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      set({ error: message });
      set((state) => {
        if (!state.instance) return state;
        return {
          instance: {
            ...state.instance,
            status: "active" as LabStatus
          }
        };
      });
    }
  },

  updateValidationResults: (results: ValidationResult[]) =>
    set((state) => {
      if (!state.instance) return state;
      return {
        instance: {
          ...state.instance,
          validationResults: results
        }
      };
    })
}));
