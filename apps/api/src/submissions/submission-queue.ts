import { Injectable, Logger } from "@nestjs/common";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ControlRoomConfig } from "@api/control-room.config";
import type { ReportRunsRequest, RunOutcome } from "@api/tournament-hub/play-plan.types";

export type QueuedSubmission = ReportRunsRequest & {
  lobbyCode: string;
  songTitle: string;
  matchId: string | null;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
  outcome: RunOutcome[] | null;
};

@Injectable()
export class SubmissionQueue {
  private readonly logger = new Logger(SubmissionQueue.name);
  private readonly listeners = new Set<() => void>();

  constructor(private readonly config: ControlRoomConfig) {}

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  async add(submission: QueuedSubmission): Promise<void> {
    await this.write(submission);
  }

  async pending(): Promise<QueuedSubmission[]> {
    const directory = this.config.queueDirectory;
    await mkdir(directory, { recursive: true });
    const names = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    const submissions: QueuedSubmission[] = [];

    for (const name of names) {
      try {
        submissions.push(JSON.parse(await readFile(join(directory, name), "utf8")) as QueuedSubmission);
      } catch (error) {
        this.logger.warn(`Ignoring unreadable queued submission ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return submissions.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
  }

  async find(submissionId: string): Promise<QueuedSubmission | null> {
    try {
      return JSON.parse(await readFile(this.pathOf(submissionId), "utf8")) as QueuedSubmission;
    } catch {
      return null;
    }
  }

  async settle(submissionId: string): Promise<void> {
    await unlink(this.pathOf(submissionId)).catch(() => undefined);
    this.announce();
  }

  async recordFailure(submission: QueuedSubmission, error: string, outcome: RunOutcome[] | null): Promise<QueuedSubmission> {
    const updated = { ...submission, attempts: submission.attempts + 1, lastError: error, outcome };
    await this.write(updated);

    return updated;
  }

  async replace(original: QueuedSubmission, edited: Pick<ReportRunsRequest, "songId" | "runs">): Promise<QueuedSubmission> {
    const replacement: QueuedSubmission = {
      ...original,
      ...edited,
      submissionId: `${original.submissionId}+${Date.now().toString(36)}`,
      attempts: 0,
      lastError: null,
      outcome: null,
    };
    await this.write(replacement);
    await this.settle(original.submissionId);

    return replacement;
  }

  private async write(submission: QueuedSubmission): Promise<void> {
    await mkdir(this.config.queueDirectory, { recursive: true });
    const target = this.pathOf(submission.submissionId);
    const temporary = `${target}.writing`;
    await writeFile(temporary, `${JSON.stringify(submission, null, 2)}\n`, "utf8");
    await rename(temporary, target);
    this.announce();
  }

  private announce(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private pathOf(submissionId: string): string {
    return join(this.config.queueDirectory, `${submissionId.replace(/[^A-Za-z0-9._+-]/g, "_")}.json`);
  }
}
