import { Injectable } from "@nestjs/common";
import type { AppEvent } from "@repo/types";

interface Client {
  userId: string;
  send: (event: AppEvent) => void;
}

@Injectable()
export class SseService {
  private clients = new Map<string, Set<Client>>();

  addClient(userId: string, send: (event: AppEvent) => void): () => void {
    const client: Client = { userId, send };

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(client);

    return () => {
      this.clients.get(userId)?.delete(client);
      if (this.clients.get(userId)?.size === 0) {
        this.clients.delete(userId);
      }
    };
  }

  publishToUser(userId: string, event: AppEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    for (const client of userClients) {
      try {
        client.send(event);
      } catch {
        // Client disconnected, cleanup happens on remove
      }
    }
  }
}
