import { Injectable, Logger } from "@nestjs/common";
import { SubmissionQueue, type QueuedSubmission } from "@api/submissions/submission-queue";
import { PlayPlanPoller } from "@api/tournament-hub/play-plan.poller";
import { TournamentHubClient } from "@api/tournament-hub/tournament-hub.client";
import type { ReportRunsResult } from "@api/tournament-hub/play-plan.types";

export type DispatchResult = { delivered: boolean; result: ReportRunsResult | null; error: string | null };

@Injectable()
export class SubmissionDispatcher {
  private readonly logger = new Logger(SubmissionDispatcher.name);

  constructor(
    private readonly queue: SubmissionQueue,
    private readonly client: TournamentHubClient,
    private readonly poller: PlayPlanPoller,
  ) {}

  async submit(submission: QueuedSubmission): Promise<DispatchResult> {
    await this.queue.add(submission);

    return this.dispatch(submission);
  }

  async resend(submissionId: string): Promise<DispatchResult> {
    const submission = await this.queue.find(submissionId);
    if (!submission) {
      return { delivered: false, result: null, error: `No queued submission ${submissionId}` };
    }

    return this.dispatch(submission);
  }

  async correct(submissionId: string, edited: Pick<QueuedSubmission, "songId" | "runs">): Promise<DispatchResult> {
    const submission = await this.queue.find(submissionId);
    if (!submission) {
      return { delivered: false, result: null, error: `No queued submission ${submissionId}` };
    }

    return this.dispatch(await this.queue.replace(submission, edited));
  }

  private async dispatch(submission: QueuedSubmission): Promise<DispatchResult> {
    try {
      const result = await this.client.reportRuns({
        submissionId: submission.submissionId,
        songId: submission.songId,
        runs: submission.runs,
      });
      const refused = result.runs.filter((run) => !run.recorded);
      if (refused.length > 0) {
        await this.queue.recordFailure(submission, `${refused.length} run(s) were refused`, result.runs);

        return { delivered: false, result, error: "Some runs were refused" };
      }

      await this.queue.settle(submission.submissionId);
      void this.poller.refresh().catch(() => undefined);

      return { delivered: true, result, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Submission ${submission.submissionId} stays queued: ${message}`);
      await this.queue.recordFailure(submission, message, null);

      return { delivered: false, result: null, error: message };
    }
  }
}
