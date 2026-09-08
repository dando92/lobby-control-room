import { Inject, Injectable, OnApplicationShutdown } from "@nestjs/common";
import type { ILobbyObserver, SyncStartClient, SyncStartClientFactory, SyncStartLobbySummaryDto } from "@lobby-control-room/syncstart-protocol";
import { LobbyCatalog, type LobbySummary } from "@api/lobbies/lobby-catalog";
import { SYNCSTART_CLIENT_FACTORY } from "@api/lobbies/syncstart-client.factory";
import { LOBBY_OBSERVERS } from "@api/lobbies/lobby-observers";
import { PlayPlanPoller } from "@api/tournament-hub/play-plan.poller";
import { VenueSettingsStore } from "@api/venue-settings.store";

export type ConnectionStatus = { isActive: boolean; isConnected: boolean };

@Injectable()
export class SyncStartRuntime implements OnApplicationShutdown {
  private readonly catalog = new LobbyCatalog();
  private client: SyncStartClient | undefined;
  private connectedTo: string | undefined;
  private discovered: SyncStartLobbySummaryDto[] = [];
  private searchedAt: string | null = null;

  constructor(
    private readonly settings: VenueSettingsStore,
    private readonly poller: PlayPlanPoller,
    @Inject(SYNCSTART_CLIENT_FACTORY) private readonly clientFactory: SyncStartClientFactory,
    @Inject(LOBBY_OBSERVERS) private readonly observers: ILobbyObserver[],
  ) {}

  get lobbies(): LobbyCatalog {
    return this.catalog;
  }

  status(): ConnectionStatus {
    return this.client ? { isActive: this.client.IsActive(), isConnected: this.client.IsConnected() } : { isActive: false, isConnected: false };
  }

  list(): { status: ConnectionStatus; lobbies: LobbySummary[]; searchedAt: string | null } {
    return { status: this.status(), lobbies: this.catalog.list(this.discovered), searchedAt: this.searchedAt };
  }

  async search(): Promise<LobbySummary[]> {
    this.discovered = await (await this.connected()).SearchLobbies();
    this.searchedAt = new Date().toISOString();

    return this.catalog.list(this.discovered);
  }

  async connectServer(): Promise<ConnectionStatus> {
    return (await this.connected()).ConnectToServer();
  }

  disconnectServer(): ConnectionStatus {
    return this.client ? this.client.DisconnectFromServer() : this.status();
  }

  async connectLobby(request: { lobbyName?: string; lobbyCode: string; password?: string }): Promise<{ lobbyCode: string }> {
    const lobbyCode = request.lobbyCode.toUpperCase();
    const result = await (await this.connected()).SpectateLobby({
      lobbyCode,
      lobbyName: request.lobbyName || lobbyCode,
      password: request.password ?? "",
    });

    return { lobbyCode: result.lobbyCode.toUpperCase() };
  }

  async createLobby(request: { lobbyName?: string; password?: string }): Promise<{ lobbyCode: string }> {
    const result = await (await this.connected()).CreateLobby({ lobbyName: request.lobbyName || undefined, password: request.password ?? "" });

    return { lobbyCode: result.lobbyCode.toUpperCase() };
  }

  async disconnectLobby(lobbyCode: string): Promise<void> {
    (await this.connected()).LeaveLobby(lobbyCode.toUpperCase());
  }

  async selectSong(lobbyCode: string, songPath: string): Promise<void> {
    return (await this.connected()).ChangeSong(lobbyCode.toUpperCase(), songPath);
  }

  async startSong(lobbyCode: string, songPath: string): Promise<void> {
    return (await this.connected()).StartSong(lobbyCode.toUpperCase(), songPath);
  }

  release(): void {
    this.client?.DisconnectAll();
    this.catalog.clear();
    this.discovered = [];
    this.searchedAt = null;
    this.client = undefined;
    this.connectedTo = undefined;
  }

  onApplicationShutdown(): void {
    this.release();
  }

  private async connected(): Promise<SyncStartClient> {
    const { syncstartUrl } = await this.settings.current();
    if (this.client && this.connectedTo === syncstartUrl) {
      return this.client;
    }

    this.client = this.clientFactory(this.poller.current().session?.tournamentId ?? 0, syncstartUrl, [this.catalog, ...this.observers]);
    this.connectedTo = syncstartUrl;

    return this.client;
  }
}
