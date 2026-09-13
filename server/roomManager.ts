import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import type { ServerMessage, Signal } from "../shared/protocol";

export interface Client {
  id: string;
  ws: WebSocket;
  roomId: string | null;
  avoidId?: string;
}

interface Room {
  id: string;
  members: [Client, Client];
}

export class RoomManager {
  private waiting: Client[] = [];
  private rooms = new Map<string, Room>();
  private clients = new Map<string, Client>();

  add(ws: WebSocket): Client {
    const client: Client = { id: randomUUID(), ws, roomId: null };
    this.clients.set(client.id, client);
    return client;
  }

  remove(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;
    this.clients.delete(id);
    this.removeFromWaiting(client);
    this.tearDownRoom(client);
  }

  find(client: Client): void {
    if (client.roomId || this.isWaiting(client)) return;
    this.waiting.push(client);
    this.tryMatch();
  }

  next(client: Client): void {
    if (client.roomId) {
      this.tearDownRoom(client);
    }
    if (this.isWaiting(client)) return;
    this.waiting.push(client);
    this.tryMatch();
  }

  leave(client: Client): void {
    this.removeFromWaiting(client);
    this.tearDownRoom(client);
  }

  signal(client: Client, data: Signal): void {
    const room = client.roomId ? this.rooms.get(client.roomId) : undefined;
    if (!room) return;
    const peer = room.members[0] === client ? room.members[1] : room.members[0];
    this.send(peer, { type: "signal", data });
  }

  private isWaiting(client: Client): boolean {
    return this.waiting.some((c) => c.id === client.id);
  }

  private removeFromWaiting(client: Client): void {
    this.waiting = this.waiting.filter((c) => c.id !== client.id);
  }

  private tryMatch(): void {
    while (this.waiting.length >= 2) {
      const a = this.waiting.shift()!;

      if (a.ws.readyState !== WebSocket.OPEN) continue;

      const idx = this.waiting.findIndex((c) => c.id !== a.avoidId);
      if (idx === -1) {
        // Only the previous partner is available; don't rematch them.
        this.waiting.push(a);
        break;
      }

      const b = this.waiting.splice(idx, 1)[0];
      if (b.ws.readyState !== WebSocket.OPEN) {
        this.waiting.push(a);
        continue;
      }

      this.match(a, b);
    }
  }

  private match(a: Client, b: Client): void {
    const room: Room = { id: randomUUID(), members: [a, b] };
    this.rooms.set(room.id, room);
    a.roomId = room.id;
    b.roomId = room.id;
    a.avoidId = b.id;
    b.avoidId = a.id;

    this.send(a, { type: "matched", roomId: room.id, initiator: true });
    this.send(b, { type: "matched", roomId: room.id, initiator: false });
  }

  private tearDownRoom(client: Client): Room | null {
    if (!client.roomId) return null;
    const room = this.rooms.get(client.roomId);
    if (!room) {
      client.roomId = null;
      return null;
    }

    const peer = room.members[0] === client ? room.members[1] : room.members[0];
    this.rooms.delete(room.id);
    client.roomId = null;
    peer.roomId = null;
    peer.avoidId = client.id;

    if (peer.ws.readyState === WebSocket.OPEN) {
      this.send(peer, { type: "peer-left", reason: "disconnect" });
      this.waiting.push(peer);
    }

    this.tryMatch();
    return room;
  }

  private send(client: Client, msg: ServerMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  }
}