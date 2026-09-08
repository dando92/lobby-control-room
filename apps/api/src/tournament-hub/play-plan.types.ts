
export type ControlRoomSession = {
  tournamentId: number;
  name: string;
  status: "open" | "closed";
};

export type PlayPlanPlayer = {
  id: number;
  name: string;
};

export type PlayPlanSong = {
  songId: number;
  title: string;
};

export type PlayPlanMatch = {
  id: string;
  name: string;
  players: PlayPlanPlayer[];
  songs: PlayPlanSong[];
};

export type PlayPlanLane = {
  scheduleId: number;
  name: string;
  current: PlayPlanMatch | null;
};

export type PlayPlan = {
  version: string;
  lanes: PlayPlanLane[];
};

export type ReportedRun = {
  playerId: number;
  score: number;
  exScore: number;
  isFailed: boolean;
};

export type ReportRunsRequest = {
  submissionId: string;
  songId: number;
  runs: ReportedRun[];
};

export type RunOutcome = {
  playerId: number;
  recorded: boolean;
  applied: boolean;
  reason: "unknown-player" | "no-waiting-round" | null;
};

export type ReportRunsResult = {
  submissionId: string;
  duplicate: boolean;
  planVersion: string;
  planEtag: string;
  runs: RunOutcome[];
};
