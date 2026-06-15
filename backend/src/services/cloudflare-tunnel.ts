/**
 * Cloudflare Zero Trust tunnel lifecycle for per-environment lab access.
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_ZONE_ID (DNS zone for tunnel hostnames)
 *   CLOUDFLARE_TUNNEL_BASE_DOMAIN (e.g. labs.yourdomain.com)
 */

const CF_API = "https://api.cloudflare.com/client/v4";

export interface LabTunnel {
  tunnelId: string;
  tunnelToken: string;
  tunnelHostname: string;   // lab-xxx.devleep.com  → ttyd (http:7681)
  sshHostname: string;      // ssh-xxx.devleep.com  → worker SSH (port 22)
  dnsRecordId: string;
  sshDnsRecordId: string;
}

type HeadersInit = Record<string, string>;

function cfHeaders(): HeadersInit {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  console.log(`[CF_HEADERS] token=${token ? "SET" : "MISSING"}`);
  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function requireAccountId(): string {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  console.log(`[REQUIRE_ACCOUNT_ID] id=${id ? "SET" : "MISSING"}`);
  if (!id) throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured");
  return id;
}


async function cfRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  // Log Cloudflare API requests for debugging tunnel creation
  const method = init.method || "GET";
  try {
    const res = await fetch(`${CF_API}${path}`, {
      ...init,
      headers: { ...cfHeaders(), ...(init.headers as Record<string, string>) },
    });
    const body = (await res.json()) as Record<string, unknown>;
    if (!body.success) {
      const errors = body.errors as Array<{ message: string }>;
      const msg =
        errors?.map((e: { message: string }) => e.message).join("; ") ||
        `Cloudflare API error HTTP ${res.status}`;
      throw new Error(`[CF_API_ERROR] ${method} ${path}: ${msg}`);
    }
    return body.result as T;
  } catch (err: any) {
    console.error(`[CF_REQUEST_FAILED] ${method} ${path}: ${err?.message || err}`);
    throw err;
  }
}

export function isCloudflareTunnelConfigured(): boolean {
  const configured = !!(
    process.env.CLOUDFLARE_API_TOKEN &&
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_ZONE_ID &&
    process.env.CLOUDFLARE_TUNNEL_BASE_DOMAIN
  );
  return configured;
}

function tunnelHostname(environmentId: string): string {
  const base = process.env.CLOUDFLARE_TUNNEL_BASE_DOMAIN!;
  const shortId = environmentId.replace(/-/g, "").slice(0, 12);
  return `lab-${shortId}.${base}`;
}

function sshTunnelHostname(environmentId: string): string {
  const base = process.env.CLOUDFLARE_TUNNEL_BASE_DOMAIN!;
  const shortId = environmentId.replace(/-/g, "").slice(0, 12);
  return `ssh-${shortId}.${base}`;
}

/**
 * Creates a remotely-managed tunnel, DNS record, SSH ingress, and connector token.
 */
export async function createLabTunnel(environmentId: string): Promise<LabTunnel> {
  console.log(`[CREATE_LAB_TUNNEL] Starting for ${environmentId}`);
  const accountId = requireAccountId();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!;
  const hostname = tunnelHostname(environmentId);
  const sshHostname = sshTunnelHostname(environmentId);
  const tunnelName = `devops-lab-${environmentId.slice(0, 8)}`;
  console.log(`[CREATE_LAB_TUNNEL] accountId=${accountId}, hostname=${hostname}, sshHostname=${sshHostname}, tunnelName=${tunnelName}`);

  // Create tunnel
  console.log(`[CREATE_LAB_TUNNEL] Step 1: Creating tunnel`);
  const tunnel = await cfRequest<{ id: string; token: string }>(
    `/accounts/${accountId}/cfd_tunnel`,
    {
      method: "POST",
      body: JSON.stringify({
        name: tunnelName,
        config_src: "cloudflare",
      }),
    }
  );
  console.error(`[CREATE_LAB_TUNNEL] Step 1 complete: tunnel.id=${tunnel.id}`);

  // Get token (use GET, not POST)
  console.error(`[CREATE_LAB_TUNNEL] Step 2: Getting token`);
  const tokenResult = await cfRequest<string>(
    `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`,
    { method: "GET" }
  );
  console.error(`[CREATE_LAB_TUNNEL] Step 2 response:`, JSON.stringify(tokenResult));
  if (!tokenResult || typeof tokenResult !== 'string') {
    console.error(`[CREATE_LAB_TUNNEL] ERROR: Invalid token from Cloudflare! Response:`, JSON.stringify(tokenResult));
    throw new Error(`Failed to get tunnel token: empty response from Cloudflare API`);
  }
  console.error(`[CREATE_LAB_TUNNEL] Step 2 complete: token length=${tokenResult.length}`);

  // Configure tunnel ingress — two routes per tunnel:
  //   1. lab-xxx.devleep.com  → http://localhost:7681  (ttyd web terminal for students)
  //   2. ssh-xxx.devleep.com  → ssh://localhost:22     (worker SSH execution channel)
  console.error(`[CREATE_LAB_TUNNEL] Step 3: Configuring ingress (ttyd + SSH)`);
  await cfRequest(
    `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`,
    {
      method: "PUT",
      body: JSON.stringify({
        config: {
          ingress: [
            {
              hostname,
              service: "http://localhost:7681",
              originRequest: {
                httpHostHeader: hostname,
                noTLSVerify: false,
                keepAliveTimeout: 30,
                connectTimeout: 30,
              },
            },
            {
              hostname: sshHostname,
              service: "ssh://localhost:22",
            },
            { service: "http_status:404" },
          ],
        },
      }),
    }
  );
  console.error(`[CREATE_LAB_TUNNEL] Step 3 complete: ingress configured (ttyd + SSH)`);

  // Create DNS record for ttyd hostname
  console.error(`[CREATE_LAB_TUNNEL] Step 4a: Creating ttyd DNS record`);
  const dnsResponse = await cfRequest<{ id: string }>(
    `/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: hostname,
        content: `${tunnel.id}.cfargotunnel.com`,
        proxied: true,
        ttl: 1,
      }),
    }
  );
  console.error(`[CREATE_LAB_TUNNEL] Step 4a complete: dnsRecordId=${dnsResponse.id}`);

  // Create DNS record for SSH hostname
  console.error(`[CREATE_LAB_TUNNEL] Step 4b: Creating SSH DNS record`);
  const sshDnsResponse = await cfRequest<{ id: string }>(
    `/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: sshHostname,
        content: `${tunnel.id}.cfargotunnel.com`,
        proxied: true,
        ttl: 1,
      }),
    }
  );
  console.error(`[CREATE_LAB_TUNNEL] Step 4b complete: sshDnsRecordId=${sshDnsResponse.id}`);

  const result = {
    tunnelId: tunnel.id,
    tunnelToken: tokenResult,
    tunnelHostname: hostname,
    sshHostname,
    dnsRecordId: dnsResponse.id,
    sshDnsRecordId: sshDnsResponse.id,
  };
  console.error(`[CREATE_LAB_TUNNEL] SUCCESS: ${JSON.stringify(result)}`);
  return result;
}

export async function deleteLabTunnel(
  tunnelId: string,
  dnsRecordId?: string,
  sshDnsRecordId?: string,
): Promise<void> {
  if (!tunnelId || !process.env.CLOUDFLARE_API_TOKEN) return;

  const accountId = requireAccountId();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!;

  // Delete both DNS records first (ttyd + SSH)
  for (const id of [dnsRecordId, sshDnsRecordId].filter(Boolean)) {
    try {
      await cfRequest(`/zones/${zoneId}/dns_records/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn(`Failed to delete DNS record ${id}:`, err);
    }
  }

  // Then delete the tunnel
  try {
    await cfRequest(`/accounts/${accountId}/cfd_tunnel/${tunnelId}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn(`Failed to delete Cloudflare tunnel ${tunnelId}:`, err);
  }
}
