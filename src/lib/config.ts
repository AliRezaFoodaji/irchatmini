const WS_DEV_PORT = 3001;

/**
 * Resolve the signaling server URL.
 * - Explicit NEXT_PUBLIC_WS_URL always wins (production behind nginx).
 * - Otherwise WebSocket points at the SAME origin on an HTTPS-served page —
 *   path comes from NEXT_PUBLIC_WS_PATH (default /ws-signal), so sub-path
 *   deployments like /p/irchatmini work without extra configuration.
 * - On plain http (local dev) we fall back to ws://<host>:3001.
 */
export function getWsUrl(): string {
  const override = process.env.NEXT_PUBLIC_WS_URL;
  if (override) return override;

  if (typeof window === "undefined") {
    return `ws://localhost:${WS_DEV_PORT}`;
  }

  if (window.location.protocol === "https:") {
    const wsPath = process.env.NEXT_PUBLIC_WS_PATH ?? "/ws-signal";
    return `wss://${window.location.host}${wsPath}`;
  }

  return `ws://${window.location.hostname}:${WS_DEV_PORT}`;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.openrelay.metered.ca:80" },
  { urls: "stun:stun.services.mozilla.com" },
];

export function getIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (!raw) return DEFAULT_ICE_SERVERS;
  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
}