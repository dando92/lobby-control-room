import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ControlRoomConfig {
  constructor(private readonly config: ConfigService) {}

  get tournamentHubUrl(): string {
    return (this.config.get<string>("TOURNAMENT_HUB_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  }

  get tournamentHubKey(): string {
    return this.config.get<string>("CONTROL_ROOM_KEY") ?? "";
  }

  get requestTimeoutMs(): number {
    return Number(this.config.get("TOURNAMENT_HUB_TIMEOUT_MS") ?? 5000);
  }

  get queueDirectory(): string {
    return this.config.get<string>("CONTROL_ROOM_QUEUE_DIR") ?? "./data/outbox";
  }

  get port(): number {
    return Number(this.config.get("CONTROL_ROOM_PORT") ?? 3002);
  }
}
