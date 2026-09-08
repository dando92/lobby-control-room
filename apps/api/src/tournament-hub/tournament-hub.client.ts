import { Injectable, Logger } from "@nestjs/common";
import { ControlRoomConfig } from "@api/control-room.config";
import type {
  ControlRoomSession,
  PlayPlan,
  ReportRunsRequest,
  ReportRunsResult,
} from "@api/tournament-hub/play-plan.types";

export type PlayPlanResponse = { changed: true; plan: PlayPlan; etag: string } | { changed: false };

@Injectable()
export class TournamentHubClient {
  private readonly logger = new Logger(TournamentHubClient.name);

  constructor(private readonly config: ControlRoomConfig) {}

  session(): Promise<ControlRoomSession> {
    return this.request<ControlRoomSession>("GET", "/v1/session");
  }

  async playPlan(ifNoneMatch?: string): Promise<PlayPlanResponse> {
    const response = await this.send("GET", "/v1/play-plan", undefined, ifNoneMatch ? { "if-none-match": ifNoneMatch } : {});
    if (response.status === 304) {
      return { changed: false };
    }
    await this.assertAccepted(response, "/v1/play-plan");

    return { changed: true, plan: (await response.json()) as PlayPlan, etag: response.headers.get("etag") ?? "" };
  }

  reportRuns(request: ReportRunsRequest): Promise<ReportRunsResult> {
    return this.request<ReportRunsResult>("POST", "/v1/runs", request);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.send(method, path, body, {});
    await this.assertAccepted(response, path);

    return (await response.json()) as T;
  }

  private send(method: string, path: string, body: unknown, headers: Record<string, string>): Promise<Response> {
    return fetch(`${this.config.tournamentHubUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.config.tournamentHubKey}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
  }

  private async assertAccepted(response: Response, path: string): Promise<void> {
    if (response.ok) {
      return;
    }
    const detail = await response.text().catch(() => "");
    this.logger.warn(`${path} answered HTTP ${response.status}: ${detail.slice(0, 200)}`);
    throw new Error(`${path} answered HTTP ${response.status}`);
  }
}
