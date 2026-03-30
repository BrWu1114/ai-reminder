import { Response } from "express";

export interface SSEClient {
  id: string;
  res: Response;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  add(id: string, res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Heartbeat every 25s to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 25_000);

    this.clients.set(id, { id, res });

    res.on("close", () => {
      clearInterval(heartbeat);
      this.clients.delete(id);
    });
  }

  send(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      client.res.write(payload);
    }
  }

  count() {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
