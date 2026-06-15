/**
 * Cloudflare Durable Objects Worker
 * Handles real-time WebSocket streams for lab provisioning/validation
 * 
 * Flow:
 * 1. Browser connects via WebSocket to /labs/:durableObjectId
 * 2. This DO holds the connection open
 * 3. Orchestrator/Validation Engine POST updates to /webhooks/:durableObjectId
 * 4. This DO fans out updates to all connected clients via WebSocket
 */

interface Session {
  id: string;
  durableObjectId: string;
  userId: string;
  labId: string;
  status: "provisioning" | "validating" | "ready" | "destroyed";
  startedAt: number;
  events: SessionEvent[];
}

interface SessionEvent {
  type: "progress" | "error" | "complete" | "warning";
  message: string;
  timestamp: number;
  details?: Record<string, any>;
}

export class LabSession {
  state: any;
  env: any;
  sessions: Map<string, Session> = new Map();
  websockets: Set<any> = new Set();

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  /**
   * HTTP handler for WebSocket upgrades and webhook deliveries
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    console.log(`📥 Fetch request: ${method} ${pathname}`);

    // WebSocket upgrade for browser connection
    if (pathname.match(/^\/ws\//)) {
      return this.handleWebSocket(request);
    }

    // Webhook endpoint for Orchestrator/Validation Engine updates
    if (method === "POST" && (pathname === "/webhook" || pathname === "/webhook/")) {
      return this.handleWebhook(request);
    }

    // Status check endpoint
    if (method === "GET" && pathname === "/status") {
      return this.getStatus();
    }

    // Log unknown requests (likely hibernation system events)
    console.log(`⚠️ Unhandled request: ${method} ${pathname}`);
    return new Response("Not Found", { status: 404 });
  }

  /**
   * Handle incoming WebSocket connections from browser
   */
  private handleWebSocket(request: Request): Response {
    try {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Upgrade to WebSocket required", { status: 400 });
      }

      // Extract sessionId from URL path: /ws/{sessionId}
      const url = new URL(request.url);
      const sessionId = url.pathname.split("/").pop() || "";

      if (!sessionId) {
        return new Response("Missing sessionId in URL", { status: 400 });
      }

      // Create WebSocket pair
      const pair = new (globalThis as any).WebSocketPair();
      const [client, server] = Object.values(pair) as any[];

      this.handleClient(server, sessionId);

      // Return the client-side of the WebSocket to the browser
      return new Response(null, {
        status: 101,
        webSocket: client,
      } as any);
    } catch (error) {
      console.error("WebSocket setup error:", error);
      return new Response("WebSocket setup failed", { status: 400 });
    }
  }

  /**
   * Manage connected WebSocket client with Hibernation API
   * - Use state.acceptWebSocket() for automatic timeout handling
   * - Send stored events immediately upon connection
   * - Listen for future webhook updates
   */
  private async handleClient(ws: any, sessionId: string) {
    // Use Hibernation API - prevents idle timeout and allows DO to hibernate
    // This is the correct way to handle long-lived WebSocket connections in Durable Objects
    this.state.acceptWebSocket(ws);
    this.websockets.add(ws);

    console.log(`✓ Client connected for session ${sessionId.slice(0, 8)} using hibernation API`);

    // Retrieve and send any stored events from previous webhooks
    try {
      const storageKey = `events:${sessionId}`;
      const storedEventsJson = await this.state.storage?.get(storageKey);
      
      if (storedEventsJson && typeof storedEventsJson === "string") {
        try {
          const storedEvents = JSON.parse(storedEventsJson) as SessionEvent[];
          console.log(`📤 Retrieved ${storedEvents.length} stored events for session ${sessionId.slice(0, 8)}`);
          
          // Send each stored event to the client
          for (const event of storedEvents) {
            try {
              ws.send(JSON.stringify({
                sessionId,
                type: event.type,
                message: event.message,
                timestamp: event.timestamp,
                details: event.details,
              }));
            } catch (error) {
              console.error("Failed to send stored event:", error);
            }
          }
        } catch (error) {
          console.error("Failed to parse stored events:", error);
        }
      } else {
        console.log(`⏳ No stored events found for session ${sessionId.slice(0, 8)}`);
      }
    } catch (error) {
      console.error("Failed to retrieve stored events:", error);
    }

    // WebSocket message handler - hibernation API calls this when messages arrive
    ws.addEventListener("message", (event: any) => {
      try {
        const message = JSON.parse(event.data);

        // Client can send heartbeat to keep connection alive (optional with hibernation)
        if (message.type === "ping") {
          console.log(`💗 Heartbeat received from client for session ${sessionId.slice(0, 8)}`);
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } else {
          console.log(`📨 Received message from client: ${message.type}`);
        }
      } catch (error) {
        console.error("Message handling error:", error);
      }
    });

    // Close handler
    ws.addEventListener("close", (event: any) => {
      this.websockets.delete(ws);
      console.log(`❌ Client disconnected for session ${sessionId.slice(0, 8)}, code=${event.code}, reason=${event.reason}, remaining clients: ${this.websockets.size}`);
    });

    // Error handler
    ws.addEventListener("error", (error: any) => {
      console.error(`🔴 WebSocket error for session ${sessionId.slice(0, 8)}:`, error.toString ? error.toString() : JSON.stringify(error));
      this.websockets.delete(ws);
    });
  }

  /**
   * Handle incoming updates from Azure Worker service
   * These arrive via HTTP POST and get fanned out to all WebSocket clients
   * Endpoint: POST /webhook or /webhook/
   * Body: { sessionId, type, message, timestamp?, details? }
   */
  private async handleWebhook(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      console.log(`📨 Webhook received on ${url.pathname}`);
      
      const payload = await request.json() as SessionEvent & { sessionId: string };

      console.log(`📨 Webhook payload: sessionId=${payload.sessionId?.slice(0, 8)}, type=${payload.type}, message=${payload.message?.substring(0, 50)}`);

      if (!payload.sessionId) {
        console.error("❌ Webhook missing sessionId");
        return new Response(JSON.stringify({ error: "Missing sessionId" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const timestamp = payload.timestamp || Date.now();

      // Store event in persistent storage (append to existing events)
      let events: SessionEvent[] = [];
      const storedEvents = await this.state.storage?.get(`events:${payload.sessionId}`);
      if (storedEvents && typeof storedEvents === "string") {
        try {
          events = JSON.parse(storedEvents);
        } catch {
          events = [];
        }
      }

      const event: SessionEvent = {
        type: payload.type,
        message: payload.message,
        timestamp: timestamp,
        details: payload.details,
      };

      events.push(event);
      
      // Store in durable storage (persists across sessions)
      await this.state.storage?.put(`events:${payload.sessionId}`, JSON.stringify(events));

      console.log(`📦 Stored event for session ${payload.sessionId?.slice(0, 8)}, total events: ${events.length}`);

      // Broadcast to all connected WebSocket clients
      const broadcastMessage = JSON.stringify({
        sessionId: payload.sessionId,
        type: event.type,
        message: event.message,
        timestamp: event.timestamp,
        details: event.details,
      });

      console.log(`📡 Broadcasting to ${this.websockets.size} connected clients`);

      let successCount = 0;
      const failedSockets: WebSocket[] = [];

      for (const ws of this.websockets) {
        try {
          ws.send(broadcastMessage);
          successCount++;
        } catch (error) {
          console.error("Failed to send to WebSocket:", error);
          failedSockets.push(ws);
        }
      }

      // Clean up failed connections
      failedSockets.forEach(ws => this.websockets.delete(ws));

      console.log(
        `✓ Event "${payload.type}" fanned out to ${successCount}/${this.websockets.size} clients for session ${payload.sessionId?.slice(0, 8)}`
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          clientsNotified: successCount,
          totalClients: this.websockets.size,
          eventId: `${payload.sessionId}-${timestamp}`
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Webhook handling error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Get current session status
   */
  private async getStatus(): Promise<Response> {
    const status = {
      connectedClients: this.websockets.size,
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const id = env.DURABLE_OBJECT_NAMESPACE.idFromName("default");
    const durableObject = env.DURABLE_OBJECT_NAMESPACE.get(id);
    return durableObject.fetch(request);
  },
};
