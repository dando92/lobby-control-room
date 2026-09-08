import { useState } from "react";
import { controlRoom, type ConsoleState, type QueuedSubmission, type ReportedRun } from "../api";
import { StatusIcon } from "../components/Glyphs";
import { time } from "../components/Shell";
import type { Act } from "./types";

export default function OutboxPage({ state, act }: { state: ConsoleState; act: Act }) {
  return (
    <>
      <header className="row">
        <h1 className="h1">Outbox</h1>
        <span className="muted">what was played and has not been accepted yet</span>
      </header>

      {state.queue.length === 0 && state.rejections.length === 0 && <p className="muted">Everything played has been accepted.</p>}

      {state.queue.map((submission) => (
        <Submission key={submission.submissionId} submission={submission} act={act} />
      ))}

      {state.rejections.length > 0 && (
        <section className="card">
          <div className="card__head">
            <span className="title">Not reported</span>
            <span className="muted">this venue could not place these, so nothing was sent and nothing was written</span>
          </div>
          <div style={{ padding: "6px 20px 14px" }}>
            {state.rejections.map((rejection) => (
              <div key={`${rejection.at}-${rejection.lobbyCode}`} className="row" style={{ padding: "9px 0", borderTop: "1px solid rgb(var(--ui-separator))" }}>
                <span className="chip" style={{ borderColor: "rgb(var(--state-failed) / 0.35)", background: "rgb(var(--state-failed) / 0.1)", color: "rgb(var(--ui-text))" }}>
                  {reasonLabel(rejection.reason)}
                </span>
                <span>{rejection.songTitle}</span>
                <span className="muted">
                  {rejection.lobbyCode} · {rejection.names.join(", ")} · {time(rejection.at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Submission({ submission, act }: { submission: QueuedSubmission; act: Act }) {
  const [editing, setEditing] = useState(false);
  const [runs, setRuns] = useState<ReportedRun[]>(submission.runs);

  return (
    <section className="card">
      <div className="card__head">
        <StatusIcon status="pending" label="waiting" />
        <span className="title">{submission.songTitle}</span>
        <span className="muted">
          {submission.lobbyCode} · {time(submission.queuedAt)}
        </span>
        <span className="spacer" />
        <span className="hint">{submission.attempts} attempt(s)</span>
      </div>

      <div style={{ padding: 20, display: "grid", gap: 12 }}>
        {submission.lastError && <div className="notice notice--failed">{submission.lastError}</div>}

        {submission.outcome && (
          <div className="row" style={{ gap: 8 }}>
            {submission.outcome.map((outcome) => (
              <span key={outcome.playerId} className="chip">
                #{outcome.playerId} · {outcome.recorded ? (outcome.applied ? "applied" : "recorded only") : (outcome.reason ?? "refused")}
              </span>
            ))}
          </div>
        )}

        {!editing && (
          <div className="row" style={{ gap: 8 }}>
            {submission.runs.map((run) => (
              <span key={run.playerId} className="chip">
                #{run.playerId} · {run.exScore.toFixed(2)}%{run.isFailed ? " · failed" : ""}
              </span>
            ))}
          </div>
        )}

        {editing && (
          <div className="stack">
            {runs.map((run, index) => (
              <div key={run.playerId} className="song">
                <span className="song__title">#{run.playerId}</span>
                <label style={{ display: "grid", gap: 4 }}>
                  <span className="hint">EX %</span>
                  <input
                    className="field"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    style={{ width: 110 }}
                    value={run.exScore}
                    onChange={(event) =>
                      setRuns((current) => current.map((candidate, at) => (at === index ? { ...candidate, exScore: Number(event.target.value) } : candidate)))
                    }
                  />
                </label>
                <label className="row" style={{ gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={run.isFailed}
                    onChange={(event) =>
                      setRuns((current) => current.map((candidate, at) => (at === index ? { ...candidate, isFailed: event.target.checked } : candidate)))
                    }
                  />
                  <span className="hint">Failed</span>
                </label>
              </div>
            ))}
          </div>
        )}

        <div className="row">
          {!editing && (
            <>
              <button type="button" className="btn btn--primary" onClick={() => act(() => controlRoom.resend(submission.submissionId))}>
                Resend
              </button>
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Correct…
              </button>
            </>
          )}
          {editing && (
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={async () => {
                  await act(() => controlRoom.correct(submission.submissionId, submission.songId, runs));
                  setEditing(false);
                }}
              >
                Send correction
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRuns(submission.runs);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </>
          )}
          <span className="spacer" />
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              if (window.confirm("Discard this submission? What was played will not reach tournament-hub.")) {
                void act(() => controlRoom.discard(submission.submissionId));
              }
            }}
          >
            Discard
          </button>
        </div>

        <p className="hint">Correcting mints a new submission id, so the far side cannot mistake the fix for a duplicate of the original.</p>
      </div>
    </section>
  );
}

function reasonLabel(reason: string): string {
  if (reason === "no-lane") return "No lane bound";
  if (reason === "unknown-song") return "Song not in the match";

  return "Nobody in the match";
}
