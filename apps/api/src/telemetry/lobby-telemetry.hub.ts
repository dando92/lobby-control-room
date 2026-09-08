import { Injectable } from "@nestjs/common";
import type {
  ILobbyObserver,
  LobbyConnectionDto,
  LobbyLivePlayerDto,
  LobbyMatchUpdateDto,
  LobbyPlayerReadyDto,
  LobbySongCompletedDto,
  LobbySongSelectedDto,
  SyncStartConnectionStatusDto,
} from "@lobby-control-room/syncstart-protocol";

export type LobbyTelemetry = {
  lobbyCode: string;
  lobbyName: string;
  songTitle: string;
  songPath: string;
  players: LobbyLivePlayerDto[];
  ready: Record<string, boolean>;
  isConnected: boolean;
  updatedAt: string;
};

export type TelemetryListener = (telemetry: LobbyTelemetry[]) => void;

@Injectable()
export class LobbyTelemetryHub implements ILobbyObserver {
  private readonly lobbies = new Map<string, LobbyTelemetry>();
  private readonly listeners = new Set<TelemetryListener>();
  private serverStatus: SyncStartConnectionStatusDto | null = null;

  snapshot(): LobbyTelemetry[] {
    return [...this.lobbies.values()].sort((left, right) => left.lobbyCode.localeCompare(right.lobbyCode));
  }

  status(): SyncStartConnectionStatusDto | null {
    return this.serverStatus;
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());

    return () => this.listeners.delete(listener);
  }

  OnSyncStartConnectionStatus(event: SyncStartConnectionStatusDto): void {
    this.serverStatus = event;
    this.announce();
  }

  OnConnected(event: LobbyConnectionDto): void {
    this.update(event.lobbyCode, (current) => ({ ...current, lobbyName: event.lobbyName, isConnected: true }));
  }

  OnConnectionActive(event: LobbyConnectionDto): void {
    this.update(event.lobbyCode, (current) => ({ ...current, lobbyName: event.lobbyName, isConnected: event.isConnected }));
  }

  OnDisconnection(event: LobbyConnectionDto): void {
    if (!event.isActive) {
      this.lobbies.delete(event.lobbyCode.toUpperCase());
      this.announce();

      return;
    }
    this.update(event.lobbyCode, (current) => ({ ...current, isConnected: false }));
  }

  OnSongSelected(event: LobbySongSelectedDto): void {
    this.update(event.lobbyCode, (current) => ({
      ...current,
      songTitle: event.song.title,
      songPath: event.song.songPath,
      players: [],
      ready: {},
    }));
  }

  OnPlayerReady(event: LobbyPlayerReadyDto): void {
    this.update(event.lobbyCode, (current) => ({ ...current, ready: { ...current.ready, [event.playerName]: event.ready } }));
  }

  OnGoingMatchUpdate(event: LobbyMatchUpdateDto): void {
    this.update(event.lobbyCode, (current) => ({
      ...current,
      songTitle: event.song?.title ?? current.songTitle,
      songPath: event.song?.songPath ?? current.songPath,
      players: event.players,
    }));
  }

  OnSongCompleted(event: LobbySongCompletedDto): void {
    this.update(event.lobbyCode, (current) => ({
      ...current,
      songTitle: event.song.title,
      songPath: event.song.songPath,
      players: event.scores.map((score) => ({ ...score })),
    }));
  }

  private update(lobbyCode: string, change: (current: LobbyTelemetry) => LobbyTelemetry): void {
    const code = lobbyCode.toUpperCase();
    const current = this.lobbies.get(code) ?? {
      lobbyCode: code,
      lobbyName: code,
      songTitle: "",
      songPath: "",
      players: [],
      ready: {},
      isConnected: false,
      updatedAt: new Date().toISOString(),
    };
    this.lobbies.set(code, { ...change(current), updatedAt: new Date().toISOString() });
    this.announce();
  }

  private announce(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
