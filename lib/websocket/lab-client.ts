/**
 * WebSocket client for real-time lab provisioning/validation updates
 * Connects to Cloudflare Durable Objects endpoint
 */

export interface LabEvent {
  type: "progress" | "error" | "complete" | "warning";
  message: string;
  timestamp: number;
  details?: Record<string, any>;
}

export class LabWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Set<(event: LabEvent) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(durableObjectUrl: string, durableObjectId: string, sessionId?: string) {
    // Route to /labs/{durableObjectId}/ws/{sessionId} for proper Cloudflare Worker routing
    const session = sessionId ? sessionId : durableObjectId;
    this.url = `${durableObjectUrl}/labs/${durableObjectId}/ws/${session}`;
    console.log("🔧 LabWebSocketClient constructor - URL:", this.url);
  }

  /**
   * Connect to the WebSocket
   * Durable Objects use hibernation API which handles idle timeouts automatically
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log("📡 Creating WebSocket to:", this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("✓ Connected to lab session (hibernation enabled)");
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Skip keep-alive messages (hibernation API may send these)
            if (data.type === "keep-alive") {
              console.log("💚 Keep-alive received");
              return;
            }
            
            console.log("📬 Message received:", data.type);
            this.notifyListeners(data);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("🔴 WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log(`🔌 WebSocket closed - readyState: ${this.ws?.readyState}, reconnect attempt: ${this.reconnectAttempts + 1}`);
          this.attemptReconnect();
        };
      } catch (error) {
        console.error("🔴 WebSocket creation error:", error);
        reject(error);
      }
    });
  }

  /**
   * Subscribe to lab events
   */
  onEvent(listener: (event: LabEvent) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log("🔌 WebSocket disconnected");
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("❌ Reconnection failed:", error);
      });
    }, delay);
  }

  /**
   * Notify all listeners of event
   */
  private notifyListeners(event: LabEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
