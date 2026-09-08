import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { VenueSettingsStore } from "@api/venue-settings.store";
import { TournamentHubClient } from "@api/tournament-hub/tournament-hub.client";
import type { ControlRoomSession, PlayPlan, PlayPlanLane } from "@api/tournament-hub/play-plan.types";

export type PlayPlanState = {
  session: ControlRoomSession | null;
  plan: PlayPlan;
  reachedAt: string | null;
  unreachableSince: string | null;
};

const EMPTY_PLAN: PlayPlan = { version: "0", lanes: [] };

@Injectable()
export class PlayPlanPoller implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PlayPlanPoller.name);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private etag: string | undefined;
  private state: PlayPlanState = { session: null, plan: EMPTY_PLAN, reachedAt: null, unreachableSince: null };

  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly client: TournamentHubClient,
    private readonly settings: VenueSettingsStore,
  ) {}

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  onApplicationBootstrap(): void {
    void this.tick();
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  current(): PlayPlanState {
    return this.state;
  }

  private announce(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  lane(scheduleId: number): PlayPlanLane | undefined {
    return this.state.plan.lanes.find((candidate) => candidate.scheduleId === scheduleId);
  }

  laneOfMatch(matchId: string): PlayPlanLane | undefined {
    return this.state.plan.lanes.find((candidate) => candidate.current?.id === matchId);
  }

  async refresh(): Promise<PlayPlanState> {
    await this.read();

    return this.state;
  }

  private async tick(): Promise<void> {
    await this.read();
    if (this.stopped) {
      return;
    }
    const { pollIntervalSeconds } = await this.settings.current();
    this.timer = setTimeout(() => void this.tick(), pollIntervalSeconds * 1000);
    this.timer.unref?.();
  }

  private async read(): Promise<void> {
    try {
      const session = this.state.session ?? (await this.client.session());
      const response = await this.client.playPlan(this.etag);
      if (response.changed) {
        this.etag = response.etag || undefined;
      }
      const wasUnreachable = Boolean(this.state.unreachableSince);
      this.state = {
        session,
        plan: response.changed ? response.plan : this.state.plan,
        reachedAt: new Date().toISOString(),
        unreachableSince: null,
      };
      if (response.changed || wasUnreachable) {
        this.announce();
      }
    } catch (error) {
      if (!this.state.unreachableSince) {
        this.logger.warn(`Tournament hub is unreachable: ${error instanceof Error ? error.message : String(error)}`);
        this.state = { ...this.state, unreachableSince: new Date().toISOString() };
        this.announce();
      }
    }
  }
}
