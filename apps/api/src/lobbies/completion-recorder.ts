import { Injectable, Logger } from "@nestjs/common";
import type { ILobbyObserver, LobbyCompletedScoreDto, LobbySongCompletedDto } from "@lobby-control-room/syncstart-protocol";
import { LobbyBindings } from "@api/lobbies/lobby-bindings";
import { SubmissionDispatcher } from "@api/submissions/submission-dispatcher";
import { PlayPlanPoller } from "@api/tournament-hub/play-plan.poller";
import type { PlayPlanLane, ReportedRun } from "@api/tournament-hub/play-plan.types";

export type RejectedCompletion = {
  lobbyCode: string;
  songTitle: string;
  names: string[];
  reason: "no-lane" | "unknown-song" | "no-known-players";
  at: string;
};

@Injectable()
export class CompletionRecorder implements ILobbyObserver {
  private readonly logger = new Logger(CompletionRecorder.name);
  private readonly rejected: RejectedCompletion[] = [];

  constructor(
    private readonly bindings: LobbyBindings,
    private readonly poller: PlayPlanPoller,
    private readonly dispatcher: SubmissionDispatcher,
  ) {}

  recentRejections(): RejectedCompletion[] {
    return [...this.rejected].reverse();
  }

  async OnSongCompleted(event: LobbySongCompletedDto): Promise<void> {
    const lobbyCode = event.lobbyCode.toUpperCase();
    const binding = this.bindings.ensure(lobbyCode);
    const lane = binding.scheduleId === null ? undefined : this.poller.lane(binding.scheduleId);
    if (!lane?.current) {
      this.reject(lobbyCode, event, "no-lane");

      return;
    }

    const songId = songIdOf(lane, event.song.title);
    if (!songId) {
      this.reject(lobbyCode, event, "unknown-song");

      return;
    }

    const runs = this.runsOf(lane, event.scores);
    if (runs.length === 0) {
      this.reject(lobbyCode, event, "no-known-players");

      return;
    }

    this.bindings.markPlayed(lobbyCode, lane.current.id, songId);
    const submissionId = this.bindings.nextSubmissionId(lobbyCode);
    const outcome = await this.dispatcher.submit({
      submissionId,
      songId,
      runs,
      lobbyCode,
      songTitle: event.song.title,
      matchId: lane.current.id,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
      outcome: null,
    });
    if (!outcome.delivered) {
      this.logger.warn(`Submission ${submissionId} is waiting in the outbox`);
    }
  }

  private runsOf(lane: PlayPlanLane, scores: LobbyCompletedScoreDto[]): ReportedRun[] {
    const idByName = new Map(lane.current.players.map((player) => [normalize(player.name), player.id]));

    return scores
      .filter((score) => score.exScore != null && idByName.has(normalize(score.playerName)))
      .map((score) => ({
        playerId: idByName.get(normalize(score.playerName)),
        score: score.score,
        exScore: score.exScore,
        isFailed: score.isFailed,
      }));
  }

  private reject(lobbyCode: string, event: LobbySongCompletedDto, reason: RejectedCompletion["reason"]): void {
    this.rejected.push({
      lobbyCode,
      songTitle: event.song.title,
      names: event.scores.map((score) => score.playerName),
      reason,
      at: new Date().toISOString(),
    });
    if (this.rejected.length > 50) {
      this.rejected.shift();
    }
    this.logger.warn(`Not reporting "${event.song.title}" from ${lobbyCode}: ${reason}`);
  }
}

function songIdOf(lane: PlayPlanLane, title: string): number | undefined {
  return lane.current.songs.find((song) => normalize(song.title) === normalize(title))?.songId;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
