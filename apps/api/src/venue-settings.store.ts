import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type VenueReach = "this-machine" | "venue-network";

export type VenueSettings = {
  syncstartUrl: string;
  reach: VenueReach;
  operatorPassword: string;
  pollIntervalSeconds: number;
};

const GROOVESTATS = "ws://syncservice.groovestats.com:1337";

@Injectable()
export class VenueSettingsStore {
  private readonly logger = new Logger(VenueSettingsStore.name);
  private settings: VenueSettings | null = null;

  constructor(private readonly config: ConfigService) {}

  async current(): Promise<VenueSettings> {
    if (!this.settings) {
      this.settings = { ...this.fromEnvironment(), ...(await this.fromFile()) };
    }

    return this.settings;
  }

  async update(change: Partial<VenueSettings>): Promise<VenueSettings> {
    const updated = { ...(await this.current()), ...change };
    assertCoherent(updated);
    await this.write(updated);
    this.settings = updated;

    return updated;
  }

  get path(): string {
    return join(dirname(this.config.get<string>("CONTROL_ROOM_QUEUE_DIR") ?? "./data/outbox"), "venue.json");
  }

  hostOf(settings: VenueSettings): string {
    return this.config.get<string>("CONTROL_ROOM_BIND") ?? (settings.reach === "venue-network" ? "0.0.0.0" : "127.0.0.1");
  }

  private fromEnvironment(): VenueSettings {
    return {
      syncstartUrl: this.config.get<string>("SYNCSTART_URL") ?? GROOVESTATS,
      reach: this.config.get<string>("CONTROL_ROOM_REACH") === "venue-network" ? "venue-network" : "this-machine",
      operatorPassword: this.config.get<string>("CONTROL_ROOM_OPERATOR_PASSWORD") ?? "",
      pollIntervalSeconds: Number(this.config.get("PLAY_PLAN_POLL_INTERVAL_SECONDS") ?? 2),
    };
  }

  private async fromFile(): Promise<Partial<VenueSettings>> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as Partial<VenueSettings>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.logger.warn(`Ignoring unreadable venue settings: ${error instanceof Error ? error.message : String(error)}`);
      }

      return {};
    }
  }

  private async write(settings: VenueSettings): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.writing`;
    await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(temporary, this.path);
  }
}

export function assertCoherent(settings: VenueSettings): void {
  if (settings.reach === "venue-network" && settings.operatorPassword.trim() === "") {
    throw new BadRequestException("A console reachable from the venue network needs an operator passphrase");
  }
  if (!/^wss?:\/\/.+/.test(settings.syncstartUrl)) {
    throw new BadRequestException("The SyncStart address must be a ws:// or wss:// URL");
  }
  if (!Number.isFinite(settings.pollIntervalSeconds) || settings.pollIntervalSeconds < 1 || settings.pollIntervalSeconds > 60) {
    throw new BadRequestException("The poll interval must be between 1 and 60 seconds");
  }
}
