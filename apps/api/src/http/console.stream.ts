import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { LobbyTelemetryHub } from "@api/telemetry/lobby-telemetry.hub";
import { PlayPlanPoller } from "@api/tournament-hub/play-plan.poller";
import { ConsoleService } from "@api/http/console.service";

const PATH = "/console/events";

const COALESCE_MS = 30;

@Injectable()
export class ConsoleStream implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ConsoleStream.name);
  private readonly server = new WebSocketServer({ noServer: true });
  private upgrade?: (request: IncomingMessage, socket: Duplex, head: Buffer) => void;
  private unsubscribe: Array<() => void> = [];
  private pending: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly console: ConsoleService,
    private readonly telemetry: LobbyTelemetryHub,
    private readonly poller: PlayPlanPoller,
  ) {}

  onApplicationBootstrap(): void {
    const httpServer = this.adapterHost.httpAdapter.getHttpServer();
    this.upgrade = (request, socket, head) => this.accept(request, socket, head);
    httpServer.on("upgrade", this.upgrade);

    this.unsubscribe = [this.telemetry.subscribe(() => this.announce()), this.poller.onChange(() => this.announce())];
  }

  onModuleDestroy(): void {
    const httpServer = this.adapterHost.httpAdapter.getHttpServer();
    if (this.upgrade) {
      httpServer.off("upgrade", this.upgrade);
    }
    this.unsubscribe.forEach((stop) => stop());
    if (this.pending) {
      clearTimeout(this.pending);
    }
    for (const client of this.server.clients) {
      client.close(1001, "Control room shutting down");
    }
    this.server.close();
  }

  announce(): void {
    if (this.pending || this.server.clients.size === 0) {
      return;
    }
    this.pending = setTimeout(() => {
      this.pending = undefined;
      void this.send();
    }, COALESCE_MS);
    this.pending.unref?.();
  }

  private accept(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (new URL(request.url ?? "/", "http://localhost").pathname !== PATH) {
      socket.destroy();

      return;
    }

    this.server.handleUpgrade(request, socket, head, (client) => {
      this.server.emit("connection", client, request);
      void this.console
        .state()
        .then((state) => client.readyState === WebSocket.OPEN && client.send(JSON.stringify(state)))
        .catch((error) => this.logger.warn(`Could not open the console stream: ${error instanceof Error ? error.message : String(error)}`));
    });
  }

  private async send(): Promise<void> {
    try {
      const frame = JSON.stringify(await this.console.state());
      for (const client of this.server.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(frame);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not push the console state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
