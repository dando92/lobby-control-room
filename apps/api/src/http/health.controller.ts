import { Controller, Get } from "@nestjs/common";
import { PlayPlanPoller } from "@api/tournament-hub/play-plan.poller";

@Controller("health")
export class HealthController {
  constructor(private readonly poller: PlayPlanPoller) {}

  @Get("live") liveness() {
    return { status: "ok" };
  }

  @Get("ready") readiness() {
    const state = this.poller.current();

    return {
      status: "ready",
      tournamentHub: {
        status: state.unreachableSince ? "unreachable" : "up",
        reachedAt: state.reachedAt,
        unreachableSince: state.unreachableSince,
      },
    };
  }
}
