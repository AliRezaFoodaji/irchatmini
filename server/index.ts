import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./roomManager";
import type { ClientMessage, ServerMessage } from "../shared/protocol";

const PORT = Number(process.env.PORT ?? 3001);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "signal-server",
        uptime: Math.round(process.uptime()),
      }),
    );
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not Found");
});

// Accept upgrades on any path so ws://host:3001 works in dev without
// extra config. The /health endpoint below stays an HTTP-only request.
const wss = new WebSocketServer({ server });
const manager = new RoomManager();

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if ((ws as WebSocket & { isAlive?: boolean }).isAlive === false) {
      ws.terminate();
      continue;
    }
    (ws as WebSocket & { isAlive?: boolean }).isAlive = false;
    ws.ping();
  }
}, 30_000);

wss.on("close", () => clearInterval(heartbeat));

function broadcast(msg: ServerMessage): void {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }
}

let online = 0;

wss.on("connection", (ws: WebSocket) => {
  online += 1;
  broadcast({ type: "stats", online });

  (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
  ws.on("pong", () => {
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
  });

  const client = manager.add(ws);

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "find":
        manager.find(client);
        break;
      case "signal":
        if (msg.data) manager.signal(client, msg.data);
        break;
      case "next":
        manager.next(client);
        break;
      case "leave":
        manager.leave(client);
        break;
      default:
        break;
    }
  });

  ws.on("close", () => {
    manager.remove(client.id);
    online = Math.max(0, online - 1);
    broadcast({ type: "stats", online });
  });

  ws.on("error", () => {
    manager.remove(client.id);
  });
});

server.listen(PORT, () => {
  console.log(`[signal-server] listening on :${PORT} (ws path /ws)`);
});