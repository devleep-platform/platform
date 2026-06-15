// lib/api/client.ts - API Client for Frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  hint?: string;
  issues?: any[];
  status?: number;
  data?: any;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): { Authorization?: string } {
    if (typeof window === "undefined") return {};

    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: ApiError }> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        return {
          error: {
            error: body.error || `HTTP ${response.status}`,
            hint: body.hint,
            issues: body.issues,
            status: response.status,
            data: body, // Include full response body for special handling
          },
        };
      }

      return { data: body as T };
    } catch (err) {
      return {
        error: {
          error: err instanceof Error ? err.message : "Unknown error",
        },
      };
    }
  }

  async get<T>(endpoint: string): Promise<{ data?: T; error?: ApiError }> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: any): Promise<{ data?: T; error?: ApiError }> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<{ data?: T; error?: ApiError }> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<{ data?: T; error?: ApiError }> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<{ data?: T; error?: ApiError }> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
