import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ConsoleState } from "../api";
import LiveScores from "../components/LiveScores";

export default function OverlaysPage({ state }: { state: ConsoleState }) {
  const [params, setParams] = useSearchParams();
  const connected = state.lobbies.filter((lobby) => lobby.isConnected);
  const selected = params.get("lobby") ?? connected[0]?.lobbyCode ?? "";
  const lobby = connected.find((candidate) => candidate.lobbyCode === selected) ?? null;
  const [copied, setCopied] = useState(false);

  const url = new URL(`/overlay/live-scoreboard`, window.location.origin);
  if (selected) {
    url.searchParams.set("lobby", selected);
  }

  return (
    <>
      <header className="row">
        <h1 className="h1">Overlays</h1>
        <span className="muted">served by this machine, for OBS on this machine</span>
      </header>

      <section className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
        <div className="row">
          <span className={`dot ${lobby ? "dot--connected" : ""}`} style={{ width: 10, height: 10 }} />
          <span className="title">Live scoreboard</span>
        </div>
        <p className="hint" style={{ maxWidth: "62ch" }}>
          Draws the lobby you point it at, on the dark surface the judgment palette is calibrated for. A spectator is told the match and the song, never
          which lobby produced them.
        </p>

        <div className="grid-fields">
          <label style={{ display: "grid", gap: 4 }}>
            <span className="hint">Lobby</span>
            <select className="field" value={selected} onChange={(event) => setParams({ lobby: event.target.value })}>
              {connected.length === 0 && <option value="">No lobby is connected</option>}
              {connected.map((candidate) => (
                <option key={candidate.lobbyCode} value={candidate.lobbyCode}>
                  {candidate.lobbyCode} — {candidate.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <span className="hint">Browser source URL</span>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <code style={{ flex: 1, minWidth: 0, border: "1px solid rgb(var(--ui-border))", background: "rgb(var(--ui-raised))", borderRadius: 4, padding: "9px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {url.href}
            </code>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selected}
              onClick={() => {
                void navigator.clipboard.writeText(url.href).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a className="btn" href={url.href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              Open
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <span className="label">Preview</span>
          <div style={{ borderRadius: 8, overflow: "hidden", maxWidth: 480 }}>
            <div style={{ background: "rgb(var(--live-screen))", color: "rgb(var(--live-text))", padding: "14px 16px 0" }}>
              <div className="hint" style={{ color: "rgb(var(--live-text-mute))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {matchOf(state, lobby?.scheduleId ?? null)}
              </div>
              <div style={{ marginTop: 4, fontWeight: 600 }}>{lobby?.telemetry?.songTitle || "No song selected"}</div>
            </div>
            <LiveScores players={lobby?.telemetry?.players ?? []} />
          </div>
          <p className="hint">
            Judgment colours are the game's own and are never adjusted for contrast, which is why this surface stays dark in both themes; a count appears
            only once it is above zero.
          </p>
        </div>
      </section>

      <div className="row" style={{ border: "1px dashed rgb(var(--ui-border))", borderRadius: 12, padding: "16px 20px" }}>
        <span className="muted">One overlay exists today. Others land here as they are built — a lane board, a bracket ticker, a now-playing strip.</span>
      </div>
    </>
  );
}

export function matchOf(state: ConsoleState, scheduleId: number | null): string {
  const lane = state.lanes.find((candidate) => candidate.scheduleId === scheduleId);

  return lane?.matchName || lane?.name || "";
}
