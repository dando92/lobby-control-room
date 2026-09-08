import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { SyncStartRuntime } from "@api/lobbies/syncstart.runtime";
import { SubmissionDispatcher, type DispatchResult } from "@api/submissions/submission-dispatcher";
import { SubmissionQueue } from "@api/submissions/submission-queue";
import { ConsoleService } from "@api/http/console.service";
import { ConsoleStream } from "@api/http/console.stream";
import { OperatorGuard } from "@api/http/operator.guard";
import { VenueSettingsStore, type VenueSettings } from "@api/venue-settings.store";
import type { ConsoleState } from "@api/http/console.view";
import type { ReportedRun } from "@api/tournament-hub/play-plan.types";

@UseGuards(OperatorGuard)
@Controller("console")
export class ConsoleController {
  constructor(
    private readonly console: ConsoleService,
    private readonly runtime: SyncStartRuntime,
    private readonly dispatcher: SubmissionDispatcher,
    private readonly queue: SubmissionQueue,
    private readonly settings: VenueSettingsStore,
    private readonly stream: ConsoleStream,
  ) {}

  @Get("state")
  state(): Promise<ConsoleState> {
    return this.console.state();
  }

  @Post("server/connect")
  async connectServer() {
    const status = await this.runtime.connectServer();
    this.stream.announce();

    return status;
  }

  @Delete("server")
  disconnectServer() {
    const status = this.runtime.disconnectServer();
    this.stream.announce();

    return status;
  }

  @Post("lobbies/search")
  async search() {
    const lobbies = await this.runtime.search();
    this.stream.announce();

    return lobbies;
  }

  @Post("lobbies/connect")
  async connectLobby(@Body() body: { lobbyCode: string; name?: string; password?: string }) {
    const lobby = await this.runtime.connectLobby({ lobbyCode: body.lobbyCode, lobbyName: body.name, password: body.password });
    this.stream.announce();

    return lobby;
  }

  @Post("lobbies")
  async createLobby(@Body() body: { name?: string; password?: string }) {
    const lobby = await this.runtime.createLobby({ lobbyName: body.name, password: body.password });
    this.stream.announce();

    return lobby;
  }

  @Delete("lobbies/:lobbyCode")
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnectLobby(@Param("lobbyCode") lobbyCode: string): Promise<void> {
    await this.runtime.disconnectLobby(lobbyCode);
    this.stream.announce();
  }

  @Post("lobbies/:lobbyCode/lane")
  @HttpCode(HttpStatus.NO_CONTENT)
  bindLane(@Param("lobbyCode") lobbyCode: string, @Body() body: { scheduleId: number | null }): void {
    this.console.bindLane(lobbyCode, body.scheduleId ?? null);
    this.stream.announce();
  }

  @Post("lanes/:scheduleId/select-song")
  @HttpCode(HttpStatus.NO_CONTENT)
  async selectSong(@Param("scheduleId") scheduleId: string, @Body() body: { songId: number }): Promise<void> {
    await this.console.selectSong(Number(scheduleId), body.songId);
    this.stream.announce();
  }

  @Post("lanes/:scheduleId/start")
  @HttpCode(HttpStatus.NO_CONTENT)
  async startSong(@Param("scheduleId") scheduleId: string, @Body() body: { songId: number }): Promise<void> {
    await this.console.startSong(Number(scheduleId), body.songId);
    this.stream.announce();
  }

  @Post("queue/:submissionId/resend")
  async resend(@Param("submissionId") submissionId: string): Promise<DispatchResult> {
    const result = await this.dispatcher.resend(submissionId);
    this.stream.announce();

    return result;
  }

  @Post("queue/:submissionId/correct")
  async correct(@Param("submissionId") submissionId: string, @Body() body: { songId: number; runs: ReportedRun[] }): Promise<DispatchResult> {
    const result = await this.dispatcher.correct(submissionId, { songId: body.songId, runs: body.runs });
    this.stream.announce();

    return result;
  }

  @Delete("queue/:submissionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async discard(@Param("submissionId") submissionId: string): Promise<void> {
    await this.queue.settle(submissionId);
    this.stream.announce();
  }

  @Post("settings")
  async saveSettings(@Body() body: Partial<VenueSettings>): Promise<VenueSettings> {
    const before = await this.settings.current();
    const settings = await this.settings.update(body);
    if (settings.syncstartUrl !== before.syncstartUrl) {
      this.runtime.release();
    }
    this.stream.announce();

    return settings;
  }
}
