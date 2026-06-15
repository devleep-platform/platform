// lib/api/auth.ts - Auth API Functions

import { apiClient } from "./client";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  token: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ data?: AuthResponse; error?: any }> {
  return apiClient.post<AuthResponse>("/auth/register", {
    email,
    password,
    name,
  });
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ data?: AuthResponse; error?: any }> {
  return apiClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
}

export async function getCurrentUser(): Promise<{ data?: User; error?: any }> {
  return apiClient.get<User>("/auth/me");
}

export async function refreshToken(): Promise<{ data?: { token: string }; error?: any }> {
  return apiClient.post<{ token: string }>("/auth/refresh");
}

export async function updateProfile(
  name: string
): Promise<{ data?: User; error?: any }> {
  return apiClient.patch<User>("/auth/me", { name });
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}
