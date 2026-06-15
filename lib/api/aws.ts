// lib/api/aws.ts - AWS Integration API Client

// Use the same backend as the main API client
const AWS_API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://devops-lab-prod-api.blackpond-e5f02c92.eastus.azurecontainerapps.io";

export interface AwsConnectResponse {
  externalId: string;
  platformAccountId: string;
  trustPolicy: Record<string, any>;
  permissionsPolicy: Record<string, any>;
  instructions: Record<string, string>;
}

export interface AwsVerifyResponse {
  success: boolean;
  message: string;
  roleArn: string;
  region: string;
  verifiedAt: string;
}

export interface AwsIntegrationStatus {
  connected: boolean;
  message?: string;
  roleArn?: string;
  region?: string;
  verifiedAt?: string;
}

/**
 * Start AWS account connection flow
 */
export async function getAwsConnectSetup(): Promise<{
  data?: AwsConnectResponse;
  error?: any;
}> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      return {
        error: {
          error: "Not authenticated. Please log in first.",
        },
      };
    }

    const response = await fetch(`${AWS_API_BASE}/aws/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: {
        error: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

/**
 * Verify AWS role and complete connection
 */
export async function verifyAwsRole(roleArn: string): Promise<{
  data?: AwsVerifyResponse;
  error?: any;
}> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      return {
        error: {
          error: "Not authenticated. Please log in first.",
        },
      };
    }

    const response = await fetch(`${AWS_API_BASE}/aws/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ roleArn }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: {
        error: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

/**
 * Get current AWS integration status
 */
export async function getAwsIntegration(): Promise<{
  data?: AwsIntegrationStatus;
  error?: any;
}> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      return {
        error: {
          error: "Not authenticated. Please log in first.",
        },
      };
    }

    const response = await fetch(`${AWS_API_BASE}/aws/integration`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: {
        error: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

/**
 * Disconnect AWS account
 */
export async function disconnectAws(): Promise<{
  data?: { success: boolean; message: string };
  error?: any;
}> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      return {
        error: {
          error: "Not authenticated. Please log in first.",
        },
      };
    }

    const response = await fetch(`${AWS_API_BASE}/aws/integration`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: {
        error: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}
