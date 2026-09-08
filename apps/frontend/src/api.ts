
export type Judgments = {
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

export type LivePlayer = {
  playerId: string;
  playerName: string;
  score: number;
  exScore?: number;
  isFailed: boolean;
  judgments?: Judgments;
};

export type LobbyTelemetry = {
  lobbyCode: string;
  lobbyName: string;
  songTitle: string;
  songPath: string;
  players: LivePlayer[];
  ready: Record<string, boolean>;
  isConnected: boolean;
  updatedAt: string;
};

export type ReportedRun = { playerId: number; score: number; exScore: number; isFailed: boolean };

export type QueuedSubmission = {
  submissionId: string;
  songId: number;
  runs: ReportedRun[];
  lobbyCode: string;
  songTitle: string;
  matchId: string | null;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
  outcome: Array<{ playerId: number; recorded: boolean; applied: boolean; reason: string | null }> | null;
};

export type ConsoleSong = { songId: number; title: string; played: boolean };
export type ConsolePlayer = { id: number; name: string };

export type ConsoleLane = {
  scheduleId: number;
  name: string;
  matchId: string | null;
  matchName: string;
  players: ConsolePlayer[];
  songs: ConsoleSong[];
  lobbyCodes: string[];
};

export type ConsoleLobby = {
  id: string;
  name: string;
  lobbyCode: string;
  isPasswordProtected: boolean;
  playerCount: number;
  spectatorCount: number;
  scheduleId: number | null;
  isConnected: boolean;
  telemetry: LobbyTelemetry | null;
};

export type VenueSettings = {
  syncstartUrl: string;
  reach: "this-machine" | "venue-network";
  operatorPassword: string;
  pollIntervalSeconds: number;
};

export type ConsoleState = {
  session: { tournamentId: number; name: string; status: "open" | "closed" } | null;
  planVersion: string;
  reachedAt: string | null;
  unreachableSince: string | null;
  server: { isActive: boolean; isConnected: boolean };
  searchedAt: string | null;
  lanes: ConsoleLane[];
  lobbies: ConsoleLobby[];
  queue: QueuedSubmission[];
  rejections: Array<{ lobbyCode: string; songTitle: string; names: string[]; reason: string; at: string }>;
  settings: VenueSettings;
};

const PASSPHRASE_KEY = "control-room.passphrase";

export function storedPassphrase(): string {
  try {
    return localStorage.getItem(PASSPHRASE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberPassphrase(passphrase: string): void {
  try {
    localStorage.setItem(PASSPHRASE_KEY, passphrase);
  } catch {
  }
}

export class UnauthorizedError extends Error {}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      "x-operator-password": storedPassphrase(),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) {
    throw new UnauthorizedError("The venue passphrase is missing or wrong");
  }
  if (!response.ok) {
    throw new Error((await response.text().catch(() => "")) || `HTTP ${response.status}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function eventsUrl(): string {
  const url = new URL("/api/console/events", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return url.href;
}

export const controlRoom = {
  state: () => call<ConsoleState>("GET", "/console/state"),
  connectServer: () => call<void>("POST", "/console/server/connect"),
  disconnectServer: () => call<void>("DELETE", "/console/server"),
  searchLobbies: () => call<void>("POST", "/console/lobbies/search"),
  connectLobby: (lobbyCode: string, name: string, password: string) =>
    call<{ lobbyCode: string }>("POST", "/console/lobbies/connect", { lobbyCode, name, password }),
  createLobby: (name: string, password: string) => call<{ lobbyCode: string }>("POST", "/console/lobbies", { name, password }),
  disconnectLobby: (lobbyCode: string) => call<void>("DELETE", `/console/lobbies/${encodeURIComponent(lobbyCode)}`),
  bindLane: (lobbyCode: string, scheduleId: number | null) =>
    call<void>("POST", `/console/lobbies/${encodeURIComponent(lobbyCode)}/lane`, { scheduleId }),
  selectSong: (scheduleId: number, songId: number) => call<void>("POST", `/console/lanes/${scheduleId}/select-song`, { songId }),
  startSong: (scheduleId: number, songId: number) => call<void>("POST", `/console/lanes/${scheduleId}/start`, { songId }),
  resend: (submissionId: string) => call<{ delivered: boolean; error: string | null }>("POST", `/console/queue/${encodeURIComponent(submissionId)}/resend`),
  correct: (submissionId: string, songId: number, runs: ReportedRun[]) =>
    call<{ delivered: boolean; error: string | null }>("POST", `/console/queue/${encodeURIComponent(submissionId)}/correct`, { songId, runs }),
  discard: (submissionId: string) => call<void>("DELETE", `/console/queue/${encodeURIComponent(submissionId)}`),
  saveSettings: (change: Partial<VenueSettings>) => call<VenueSettings>("POST", "/console/settings", change),
};
