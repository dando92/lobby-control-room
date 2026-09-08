import type { ILobbyObserver, LobbyConnectionDto, SyncStartLobbySummaryDto } from "@lobby-control-room/syncstart-protocol";

export type LobbySummary = {
  id: string;
  name: string;
  lobbyCode: string;
  isPasswordProtected: boolean;
  playerCount: number;
  spectatorCount: number;
};

export class LobbyCatalog implements ILobbyObserver {
  private readonly lobbyMeta = new Map<string, LobbyConnectionDto>();

  OnConnectionActive(event: LobbyConnectionDto): void {
    this.remember(event);
  }

  OnConnected(event: LobbyConnectionDto): void {
    this.remember(event);
  }

  OnDisconnection(event: LobbyConnectionDto): void {
    const lobbyCode = event.lobbyCode.toUpperCase();
    if (!event.isActive) {
      this.lobbyMeta.delete(lobbyCode);

      return;
    }
    this.lobbyMeta.set(lobbyCode, event);
  }

  list(discovered: SyncStartLobbySummaryDto[]): LobbySummary[] {
    const result = new Map<string, LobbySummary>();
    for (const lobby of discovered) {
      const lobbyCode = lobby.code.toUpperCase();
      const meta = this.lobbyMeta.get(lobbyCode);
      result.set(lobbyCode, {
        id: lobbyCode,
        name: meta?.lobbyName ?? lobbyCode,
        lobbyCode,
        isPasswordProtected: lobby.isPasswordProtected,
        playerCount: lobby.playerCount,
        spectatorCount: lobby.spectatorCount,
      });
    }
    for (const meta of this.lobbyMeta.values()) {
      const existing = result.get(meta.lobbyCode);
      result.set(meta.lobbyCode, {
        id: meta.lobbyId,
        name: meta.lobbyName,
        lobbyCode: meta.lobbyCode,
        isPasswordProtected: existing?.isPasswordProtected ?? false,
        playerCount: existing?.playerCount ?? 0,
        spectatorCount: existing?.spectatorCount ?? 0,
      });
    }

    return [...result.values()].sort((left, right) => left.lobbyCode.localeCompare(right.lobbyCode));
  }

  isConnected(lobbyCode: string): boolean {
    return this.lobbyMeta.has(lobbyCode.toUpperCase());
  }

  clear(): void {
    this.lobbyMeta.clear();
  }

  private remember(event: LobbyConnectionDto): void {
    this.lobbyMeta.set(event.lobbyCode.toUpperCase(), event);
  }
}
