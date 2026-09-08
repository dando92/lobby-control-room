import type { LobbySummary } from "@api/lobbies/lobby-catalog";
import type { RejectedCompletion } from "@api/lobbies/completion-recorder";
import type { QueuedSubmission } from "@api/submissions/submission-queue";
import type { LobbyTelemetry } from "@api/telemetry/lobby-telemetry.hub";
import type { VenueSettings } from "@api/venue-settings.store";
import type { ControlRoomSession, PlayPlanPlayer, PlayPlanSong } from "@api/tournament-hub/play-plan.types";

export type ConsoleSong = PlayPlanSong & { played: boolean };

export type ConsoleLane = {
  scheduleId: number;
  name: string;
  matchId: string | null;
  matchName: string;
  players: PlayPlanPlayer[];
  songs: ConsoleSong[];
  lobbyCodes: string[];
};

export type ConsoleLobby = LobbySummary & {
  scheduleId: number | null;
  isConnected: boolean;
  telemetry: LobbyTelemetry | null;
};

export type ConsoleState = {
  session: ControlRoomSession | null;
  planVersion: string;
  reachedAt: string | null;
  unreachableSince: string | null;
  server: { isActive: boolean; isConnected: boolean };
  searchedAt: string | null;
  lanes: ConsoleLane[];
  lobbies: ConsoleLobby[];
  queue: QueuedSubmission[];
  rejections: RejectedCompletion[];
  settings: VenueSettings;
};
