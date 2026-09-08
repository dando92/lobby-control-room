import { Link } from "react-router-dom";
import { controlRoom, type ConsoleLane, type ConsoleLobby, type ConsoleState } from "../api";
import { OverlaysIcon, StatusIcon } from "../components/Glyphs";
import LiveScores from "../components/LiveScores";
import type { Act } from "./types";

export default function LanesPage({ state, act }: { state: ConsoleState; act: Act }) {
  const unbound = state.lobbies.filter((lobby) => lobby.scheduleId === null && lobby.isConnected);

  return (
    <>
      <header className="row">
        <h1 className="h1">Lanes</h1>
        <span className="muted">{state.lanes.length === 1 ? "1 running schedule" : `${state.lanes.length} running schedules`}</span>
      </header>

      {state.lanes.length === 0 && (
        <p className="muted">
          No running schedule. A lane is a running schedule and nothing else, so an event driven without one leaves this empty.
        </p>
      )}

      {state.lanes.map((lane) => (
        <Lane key={lane.scheduleId} lane={lane} lobbies={state.lobbies.filter((lobby) => lobby.scheduleId === lane.scheduleId)} act={act} />
      ))}

      {unbound.map((lobby) => (
        <div key={lobby.lobbyCode} className="row" style={{ background: "rgb(var(--ui-raised))", border: "1px solid rgb(var(--ui-border))", borderRadius: 12, padding: "12px 20px" }}>
          <span className="label">Not on a lane</span>
          <span className="dot dot--connected" style={{ marginLeft: 6 }} />
          <strong>{lobby.lobbyCode}</strong>
          <span className="muted">{lobby.telemetry?.songTitle || "idle"}</span>
          <span className="spacer" />
          <Link className="btn" to="/lobbies">
            Bind to a lane…
          </Link>
        </div>
      ))}
    </>
  );
}

function Lane({ lane, lobbies, act }: { lane: ConsoleLane; lobbies: ConsoleLobby[]; act: Act }) {
  const playing = lobbies.some((lobby) => (lobby.telemetry?.players.length ?? 0) > 0);
  const commandable = lobbies.length > 0 && Boolean(lane.matchId);

  return (
    <section className="card">
      <div className="card__head">
        {playing ? <span className="dot dot--live" style={{ width: 10, height: 10 }} /> : <StatusIcon status="idle" label="waiting" />}
        <span className="title">{lane.name}</span>
        <span className="muted">{lane.matchName || "No current match"}</span>
        <span className="spacer" />
        <div className="row" style={{ gap: 6 }}>
          {lane.players.map((player) => (
            <span key={player.id} className="chip">
              {player.name}
            </span>
          ))}
        </div>
      </div>

      <div className="lane__body">
        <div className="lane__plan">
          <div className="row" style={{ gap: 10 }}>
            <span className="label">May be played</span>
            <span className="hint">every cabinet on this lane plays the same song</span>
          </div>

          {lane.songs.length === 0 && <p className="muted">Nothing playable on this match.</p>}

          <div className="stack">
            {lane.songs.map((song) => (
              <div key={song.songId} className={`song ${song.played ? "song--played" : ""}`}>
                <StatusIcon status={song.played ? "done" : "idle"} label={song.played ? "played" : "not played"} />
                <span className="song__title">{song.title}</span>
                <button type="button" className="btn" disabled={!commandable} onClick={() => act(() => controlRoom.selectSong(lane.scheduleId, song.songId))}>
                  Select
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!commandable}
                  onClick={() => act(() => controlRoom.startSong(lane.scheduleId, song.songId))}
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lane__driving">
          <span className="label">Driving this lane</span>

          {lobbies.length === 0 && (
            <>
              <p className="muted">No lobby is driving this lane, so nothing here can be played.</p>
              <Link className="btn btn--primary" to="/lobbies" style={{ justifySelf: "start", textDecoration: "none" }}>
                Bind a lobby…
              </Link>
            </>
          )}

          {lobbies.map((lobby) => (
            <div key={lobby.lobbyCode} style={{ border: "1px solid rgb(var(--ui-border))", borderRadius: 12, background: "rgb(var(--ui-surface))", overflow: "hidden" }}>
              <div className="row" style={{ padding: "10px 12px", flexWrap: "nowrap" }}>
                <span className={`dot ${lobby.isConnected ? "dot--connected" : ""}`} />
                <strong>{lobby.lobbyCode}</strong>
                <span className="spacer" />
                <Link className="btn" to={`/overlays?lobby=${encodeURIComponent(lobby.lobbyCode)}`} style={{ display: "flex", gap: 6, textDecoration: "none" }}>
                  <OverlaysIcon size={14} />
                  OBS
                </Link>
                <button type="button" className="btn btn--danger" onClick={() => act(() => controlRoom.disconnectLobby(lobby.lobbyCode))}>
                  Disconnect
                </button>
              </div>
              {lobby.telemetry && lobby.telemetry.players.length > 0 && <LiveScores players={lobby.telemetry.players} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
