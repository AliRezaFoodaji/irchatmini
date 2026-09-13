import type { ClientMessage, ServerMessage } from "@/lib/protocol";
import { getWsUrl } from "@/lib/config";

export type ConnectionState = "connecting" | "connected" | "disconnected";

type MessageListener = (msg: ServerMessage) => void;
type StatusListener = (state: ConnectionState) => void;

const MAX_RETRY_DELAY_MS = 15_000;
const INITIAL_RETRY_DELAY_MS = 1_000;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private shouldConnect = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: ClientMessage[] = [];
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();

  connect(): Promise<void> {
    this.shouldConnect = true;
    return this.open();
  }

  /** Send a message; buffered while the socket is reconnecting. */
  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else if (this.shouldConnect) {
      this.queue.push(msg);
    }
  }

  disconnect(): void {
    this.shouldConnect = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.queue = [];
    this.ws?.close();
    this.ws = null;
    this.notifyStatus("disconnected");
  }

  onMessage(cb: MessageListener): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onStatusChange(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(getWsUrl());
      this.ws = ws;
      let settled = false;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        while (this.queue.length > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(this.queue.shift()));
        }
        this.notifyStatus("connected");
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as ServerMessage;
          for (const l of this.messageListeners) l(msg);
        } catch {
          /* ignore malformed messages */
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error("connection-failed"));
        }
      };

      ws.onclose = () => {
        this.ws = null;
        if (!settled) {
          settled = true;
          reject(new Error("connection-failed"));
        } else {
          this.notifyStatus("disconnected");
        }
        if (this.shouldConnect) this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    const delay = Math.min(
      INITIAL_RETRY_DELAY_MS * 2 ** this.reconnectAttempt,
      MAX_RETRY_DELAY_MS,
    );
    this.reconnectAttempt += 1;
    this.notifyStatus("connecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open().catch(() => {
        /* close handler schedules the next attempt */
      });
    }, delay);
  }

  private notifyStatus(state: ConnectionState): void {
    for (const l of this.statusListeners) l(state);
  }
}