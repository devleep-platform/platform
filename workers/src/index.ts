import { LabSession } from "./durable-objects/lab-session";

// Helper function to add CORS headers to responses
function addCORSHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Upgrade, Connection");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection",
        },
      });
    }

    // Route lab session requests to Durable Objects
    if (url.pathname.startsWith("/labs/")) {
      const pathParts = url.pathname.split("/").filter(p => p);
      // Path: /labs/{durableObjectId}/{action}/{subpath...}
      // Extract: labs[0], durableObjectId[1], action[2], ...
      const durableObjectId = pathParts[1];
      const action = pathParts[2];

      if (!durableObjectId) {
        return new Response("Invalid request", { status: 400 });
      }

      // Reconstruct the path for the Durable Object
      // /labs/{durableObjectId}/webhook -> /webhook
      // /labs/{durableObjectId}/ws/{sessionId} -> /ws/{sessionId}
      const doPath = action ? `/${action}/${pathParts.slice(3).join("/")}` : "/";
      const doURL = new URL(request.url);
      doURL.pathname = doPath;

      // Create new request with rewritten URL
      // For WebSocket upgrades, don't include body
      const isWebSocketUpgrade = request.headers.get("Upgrade") === "websocket";
      const doRequest = new Request(doURL.toString(), {
        method: request.method,
        headers: request.headers,
        body: isWebSocketUpgrade ? undefined : request.body,
      });

      const id = env.LAB_SESSION_NAMESPACE.idFromName(durableObjectId);
      const durable = env.LAB_SESSION_NAMESPACE.get(id);

      // Forward the request to the Durable Object
      // Don't add CORS headers for WebSocket upgrades as they have different handling
      const response = await durable.fetch(doRequest);
      return isWebSocketUpgrade ? response : addCORSHeaders(response);
    }

    // Terraform state endpoints (backend operations)
    if (url.pathname.startsWith("/terraform/state")) {
      const response = await handleTerraformState(request, env);
      return addCORSHeaders(response);
    }

    // Webhook endpoint for job progress (from Worker service)
    if (url.pathname.startsWith("/webhook/")) {
      const response = await handleJobWebhook(request, env);
      return addCORSHeaders(response);
    }

    // Health check
    if (url.pathname === "/health") {
      return addCORSHeaders(new Response(JSON.stringify({ 
        status: "ok",
        service: "cloudflare-worker",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" },
      }));
    }

    return addCORSHeaders(new Response(JSON.stringify({ error: "Not Found" }), { 
      status: 404,
      headers: { "Content-Type": "application/json" }
    }));
  },
};

/**
 * Handle terraform state backend operations
 * GET /terraform/state - retrieve state
 * PUT /terraform/state - update state
 * DELETE /terraform/state - delete state
 * POST /terraform/state/lock - acquire lock
 * DELETE /terraform/state/unlock - release lock
 */
async function handleTerraformState(request: Request, env: any): Promise<Response> {
  // Verify authentication (basic auth with terraform user)
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const path = new URL(request.url).pathname;
  const r2 = env.TERRAFORM_STATE;

  if (!r2) {
    return new Response("R2 binding not configured", { status: 500 });
  }

  try {
    if (request.method === "GET") {
      // GET /terraform/state?key=<sessionId>
      const sessionId = new URL(request.url).searchParams.get("key");
      if (!sessionId) {
        return new Response("Missing key parameter", { status: 400 });
      }

      const stateKey = `${sessionId}/terraform.tfstate`;
      const obj = await r2.get(stateKey);
      
      if (!obj) {
        return new Response("{}", { 
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }

      const state = await obj.text();
      return new Response(state, { 
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    if (request.method === "PUT") {
      // PUT /terraform/state - upload/update state
      const sessionId = new URL(request.url).searchParams.get("key");
      if (!sessionId) {
        return new Response("Missing key parameter", { status: 400 });
      }

      const body = await request.text();
      const stateKey = `${sessionId}/terraform.tfstate`;
      
      await r2.put(stateKey, body, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { 
          uploadedAt: new Date().toISOString(),
          sessionId: sessionId
        }
      });

      return new Response(JSON.stringify({ ok: true }), { 
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    if (request.method === "DELETE") {
      // DELETE /terraform/state - delete state
      const sessionId = new URL(request.url).searchParams.get("key");
      if (!sessionId) {
        return new Response("Missing key parameter", { status: 400 });
      }

      const stateKey = `${sessionId}/terraform.tfstate`;
      await r2.delete(stateKey);

      return new Response(JSON.stringify({ ok: true }), { 
        headers: { "Content-Type": "application/json" },
        status: 204
      });
    }

    if (request.method === "POST" && path.includes("/lock")) {
      // POST /terraform/state/lock - acquire lock
      const sessionId = new URL(request.url).searchParams.get("key");
      if (!sessionId) {
        return new Response("Missing key parameter", { status: 400 });
      }

      const lockKey = `${sessionId}/.terraform.lock.hcl`;
      const body = await request.text();
      
      // Check if lock already exists (would be a conflict)
      const existing = await r2.get(lockKey);
      if (existing) {
        return new Response(JSON.stringify({ error: "locked" }), { 
          status: 423, // Locked
          headers: { "Content-Type": "application/json" }
        });
      }

      await r2.put(lockKey, body, {
        httpMetadata: { contentType: "text/plain" }
      });

      return new Response(JSON.stringify({ ok: true }), { 
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    if (request.method === "DELETE" && path.includes("/unlock")) {
      // DELETE /terraform/state/unlock - release lock
      const sessionId = new URL(request.url).searchParams.get("key");
      if (!sessionId) {
        return new Response("Missing key parameter", { status: 400 });
      }

      const lockKey = `${sessionId}/.terraform.lock.hcl`;
      await r2.delete(lockKey);

      return new Response(JSON.stringify({ ok: true }), { 
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    console.error("Terraform state operation error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * Handle job progress webhooks from Azure Worker service
 * POST /webhook/:sessionId - receive job progress update
 */
async function handleJobWebhook(request: Request, env: any): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const path = new URL(request.url).pathname;
    const sessionId = path.split("/").pop();
    
    if (!sessionId) {
      return new Response("Missing sessionId in path", { status: 400 });
    }

    const payload = await request.json() as any;

    // Route to the appropriate Durable Object for this session
    const id = env.LAB_SESSION_NAMESPACE.idFromName(sessionId);
    const durable = env.LAB_SESSION_NAMESPACE.get(id);

    // Forward to the Durable Object's webhook handler
    const doRequest = new Request(`https://durable-object/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        ...payload
      })
    });

    return durable.fetch(doRequest);
  } catch (error: any) {
    console.error("Webhook handling error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export { LabSession };
