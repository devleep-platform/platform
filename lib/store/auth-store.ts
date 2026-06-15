// lib/store/auth-store.ts - Zustand store for authentication

import { create } from "zustand";
import { getCurrentUser, getAuthToken, setAuthToken, clearAuthToken } from "../api/auth";

export interface AuthState {
  user: { id: string; email: string; name?: string } | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setToken: (token: string) => void;
  setUser: (user: { id: string; email: string; name?: string } | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const token = getAuthToken();

      if (!token) {
        set({ loading: false, isAuthenticated: false });
        return;
      }

      set({ token });

      const { data: user, error } = await getCurrentUser();

      if (error || !user) {
        clearAuthToken();
        set({ loading: false, isAuthenticated: false, token: null, error: error?.error });
        return;
      }

      set({
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        isAuthenticated: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  },

  setToken: (token: string) => {
    setAuthToken(token);
    set({ token });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: user !== null });
  },

  logout: () => {
    clearAuthToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));
