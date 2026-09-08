import { BadRequestException, Injectable } from "@nestjs/common";
import { CompletionRecorder } from "@api/lobbies/completion-recorder";
import { LobbyBindings } from "@api/lobbies/lobby-bindings";
import { SyncStartRuntime } from "@api/lobbies/syncstart.runtime";
import { SubmissionQueue } from "@api/submissions/submission-queue";
import { LobbyTelemetryHub } from "@api/telemetry/lobby-telemetry.hub";
import { PlayPlanPoller } from "@api/tournament-hub/play-plan.poller";
import { VenueSettingsStore } from "@api/venue-settings.store";
import type { ConsoleLane, ConsoleLobby, ConsoleState } from "@api/http/console.view";

@Injectable()
export class ConsoleService {
  constructor(
    private readonly poller: PlayPlanPoller,
    private readonly runtime: SyncStartRuntime,
    private readonly bindings: LobbyBindings,
    private readonly telemetry: LobbyTelemetryHub,
    private readonly queue: SubmissionQueue,
    private readonly completions: CompletionRecorder,
    private readonly settings: VenueSettingsStore,
  ) {}

  async state(): Promise<ConsoleState> {
    const plan = this.poller.current();
    const { status, lobbies, searchedAt } = this.runtime.list();
    const telemetryByCode = new Map(this.telemetry.snapshot().map((entry) => [entry.lobbyCode, entry]));
    const bindings = this.bindings.all();

    const lanes: ConsoleLane[] = plan.plan.lanes.map((lane) => {
      const boundCodes = bindings.filter((binding) => binding.scheduleId === lane.scheduleId).map((binding) => binding.lobbyCode);
      const played = new Set(boundCodes.flatMap((code) => this.bindings.playedSongIds(code, lane.current?.id ?? null)));

      return {
        scheduleId: lane.scheduleId,
        name: lane.name,
        matchId: lane.current?.id ?? null,
        matchName: lane.current?.name ?? "",
        players: lane.current?.players ?? [],
        songs: (lane.current?.songs ?? []).map((song) => ({ ...song, played: played.has(song.songId) })),
        lobbyCodes: boundCodes,
      };
    });

    const consoleLobbies: ConsoleLobby[] = lobbies.map((lobby) => ({
      ...lobby,
      scheduleId: this.bindings.find(lobby.lobbyCode)?.scheduleId ?? null,
      isConnected: this.runtime.lobbies.isConnected(lobby.lobbyCode),
      telemetry: telemetryByCode.get(lobby.lobbyCode) ?? null,
    }));

    return {
      session: plan.session,
      planVersion: plan.plan.version,
      reachedAt: plan.reachedAt,
      unreachableSince: plan.unreachableSince,
      server: status,
      searchedAt,
      lanes,
      lobbies: consoleLobbies,
      queue: await this.queue.pending(),
      rejections: this.completions.recentRejections(),
      settings: await this.settings.current(),
    };
  }

  bindLane(lobbyCode: string, scheduleId: number | null): void {
    if (scheduleId !== null && !this.poller.lane(scheduleId)) {
      throw new BadRequestException(`No lane ${scheduleId} in the current plan`);
    }
    this.bindings.bind(lobbyCode, scheduleId);
  }

  selectSong(scheduleId: number, songId: number): Promise<void[]> {
    return this.fanOut(scheduleId, songId, (lobbyCode, songPath) => this.runtime.selectSong(lobbyCode, songPath));
  }

  startSong(scheduleId: number, songId: number): Promise<void[]> {
    return this.fanOut(scheduleId, songId, (lobbyCode, songPath) => this.runtime.startSong(lobbyCode, songPath));
  }

  private fanOut(scheduleId: number, songId: number, command: (lobbyCode: string, songPath: string) => Promise<void>): Promise<void[]> {
    const lane = this.poller.lane(scheduleId);
    const song = lane?.current?.songs.find((candidate) => candidate.songId === songId);
    if (!song) {
      throw new BadRequestException(`Song ${songId} is not on lane ${scheduleId}`);
    }

    const lobbyCodes = this.bindings.all().filter((binding) => binding.scheduleId === scheduleId).map((binding) => binding.lobbyCode);
    if (lobbyCodes.length === 0) {
      throw new BadRequestException(`No lobby is driving lane ${scheduleId}`);
    }

    return Promise.all(lobbyCodes.map((lobbyCode) => command(lobbyCode, song.title)));
  }
}
