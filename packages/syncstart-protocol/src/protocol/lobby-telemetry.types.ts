
export type LobbyIdentityDto = {
  tournamentId: number;
  lobbyId: string;
  lobbyName: string;
  lobbyCode: string;
};

export type LobbyConnectionDto = LobbyIdentityDto & {
  isActive: boolean;
  isConnected: boolean;
};

export type SyncStartConnectionStatusDto = {
  tournamentId: number;
  isActive: boolean;
  isConnected: boolean;
};

export type LobbySongDto = {
  songPath: string;
  title: string;
  artist: string;
  songLength: number;
};

export type LobbySongSelectedDto = LobbyIdentityDto & { song: LobbySongDto };

export type LobbyPlayerReadyDto = LobbyIdentityDto & {
  playerId: string;
  playerName: string;
  ready: boolean;
};

export type LobbyJudgmentsDto = {
  fantasticPlus: number;
  fantastics: number;
  excellents: number;
  greats: number;
  decents: number;
  wayOffs: number;
  misses: number;
  minesHit: number;
  holdsHeld: number;
  totalHolds: number;
};

export type LobbyLivePlayerDto = {
  playerId: string;
  playerName: string;
  score: number;
  exScore?: number;
  isFailed: boolean;
  songProgression?: { currentTime: number; totalTime: number };
  judgments?: LobbyJudgmentsDto;
};

export type LobbyMatchUpdateDto = LobbyIdentityDto & {
  song?: LobbySongDto;
  players: LobbyLivePlayerDto[];
};

export type LobbyCompletedScoreDto = {
  playerId: string;
  playerName: string;
  score: number;
  exScore?: number;
  isFailed: boolean;
};

export type LobbySongCompletedDto = LobbyIdentityDto & {
  song: LobbySongDto;
  scores: LobbyCompletedScoreDto[];
};
