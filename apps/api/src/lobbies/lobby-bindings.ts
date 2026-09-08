import { Injectable } from "@nestjs/common";

export type LobbyBinding = {
  lobbyCode: string;
  scheduleId: number | null;
  sessionId: string;
  sequence: number;
  matchId: string | null;
  playedSongIds: number[];
};

@Injectable()
export class LobbyBindings {
  private readonly bindings = new Map<string, LobbyBinding>();

  ensure(lobbyCode: string): LobbyBinding {
    const code = lobbyCode.toUpperCase();
    const existing = this.bindings.get(code);
    if (existing) {
      return existing;
    }

    const binding: LobbyBinding = {
      lobbyCode: code,
      scheduleId: null,
      sessionId: `${code}-${Date.now().toString(36)}`,
      sequence: 0,
      matchId: null,
      playedSongIds: [],
    };
    this.bindings.set(code, binding);

    return binding;
  }

  all(): LobbyBinding[] {
    return [...this.bindings.values()];
  }

  find(lobbyCode: string): LobbyBinding | undefined {
    return this.bindings.get(lobbyCode.toUpperCase());
  }

  bind(lobbyCode: string, scheduleId: number | null): LobbyBinding {
    const binding = this.ensure(lobbyCode);
    binding.scheduleId = scheduleId;

    return binding;
  }

  forget(lobbyCode: string): void {
    this.bindings.delete(lobbyCode.toUpperCase());
  }

  nextSubmissionId(lobbyCode: string): string {
    const binding = this.ensure(lobbyCode);
    binding.sequence += 1;

    return `${binding.sessionId}:${binding.sequence}`;
  }

  markPlayed(lobbyCode: string, matchId: string | null, songId: number): void {
    const binding = this.ensure(lobbyCode);
    if (binding.matchId !== matchId) {
      binding.matchId = matchId;
      binding.playedSongIds = [];
    }
    if (!binding.playedSongIds.includes(songId)) {
      binding.playedSongIds.push(songId);
    }
  }

  playedSongIds(lobbyCode: string, matchId: string | null): number[] {
    const binding = this.bindings.get(lobbyCode.toUpperCase());

    return binding && binding.matchId === matchId ? [...binding.playedSongIds] : [];
  }
}
