import { useState } from "react";
import { controlRoom, type ConsoleState } from "../api";
import { LockIcon, SearchIcon, StatusIcon } from "../components/Glyphs";
import { time } from "../components/Shell";
import type { Act } from "./types";

export default function LobbiesPage({ state, act }: { state: ConsoleState; act: Act }) {
  return (
    <>
      <header className="row">
        <h1 className="h1">Lobbies</h1>
        <span className="spacer" />
        <span className="hint">{state.searchedAt ? `Searched ${time(state.searchedAt)}` : "Never searched"}</span>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!state.server.isConnected}
          style={{ display: "flex", gap: 7 }}
          onClick={() => act(() => controlRoom.searchLobbies())}
        >
          <SearchIcon />
          Search lobbies
        </button>
      </header>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", flexWrap: "wrap" }}>
        <span className={`dot ${state.server.isConnected ? "dot--connected" : ""}`} style={{ width: 10, height: 10 }} />
        <strong>SyncStart server</strong>
        <span className="muted">{state.settings.syncstartUrl}</span>
        <span className="spacer" />
        {state.server.isConnected ? (
          <button type="button" className="btn btn--danger" onClick={() => act(() => controlRoom.disconnectServer())}>
            Disconnect
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => act(() => controlRoom.connectServer())}>
            Connect
          </button>
        )}
      </div>

      <section className="card">
        <div className="card__head">
          <span className="label">Known lobbies</span>
        </div>
        {state.lobbies.length === 0 && (
          <p className="muted" style={{ padding: "16px 20px", margin: 0 }}>
            {state.server.isConnected ? "Nothing found yet. Search, or open a lobby below." : "Connect to the server to find lobbies."}
          </p>
        )}
        {state.lobbies.map((lobby) => (
          <div key={lobby.lobbyCode} style={{ padding: "13px 20px", borderTop: "1px solid rgb(var(--ui-separator))" }}>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              {lobby.isConnected ? <span className="dot dot--connected" /> : <StatusIcon status="idle" label="discovered" />}
              <strong style={{ fontSize: 15 }}>{lobby.lobbyCode}</strong>
              <span className="muted">{lobby.name !== lobby.lobbyCode ? lobby.name : ""}</span>
              {lobby.isPasswordProtected && <LockIcon />}
              <span className="spacer" />
              {lobby.isConnected ? (
                <>
                  <span className="hint">Lane</span>
                  <select
                    className="field"
                    value={lobby.scheduleId ?? ""}
                    onChange={(event) => act(() => controlRoom.bindLane(lobby.lobbyCode, event.target.value === "" ? null : Number(event.target.value)))}
                  >
                    <option value="">Not driving a lane</option>
                    {state.lanes.map((lane) => (
                      <option key={lane.scheduleId} value={lane.scheduleId}>
                        {lane.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn--danger" onClick={() => act(() => controlRoom.disconnectLobby(lobby.lobbyCode))}>
                    Disconnect
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => act(() => controlRoom.connectLobby(lobby.lobbyCode, lobby.name, ""))}>
                  Join
                </button>
              )}
            </div>
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <span className="hint">
                {lobby.playerCount} playing · {lobby.spectatorCount} watching
              </span>
              {lobby.telemetry && <span className="hint">· {lobby.telemetry.songTitle || "no song selected"}</span>}
            </div>
          </div>
        ))}
      </section>

      <OpenLobby connected={state.server.isConnected} act={act} />
    </>
  );
}

function OpenLobby({ connected, act }: { connected: boolean; act: Act }) {
  const [lobbyCode, setLobbyCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
      <span className="label">Open a lobby</span>
      <div className="grid-fields">
        <label style={{ display: "grid", gap: 4 }}>
          <span className="hint">Code</span>
          <input className="field" value={lobbyCode} placeholder="ABCD" onChange={(event) => setLobbyCode(event.target.value.toUpperCase())} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="hint">Name</span>
          <input className="field" value={name} placeholder="Main stage" onChange={(event) => setName(event.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="hint">Password</span>
          <input className="field" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!connected || lobbyCode.trim() === ""}
          onClick={() => act(() => controlRoom.connectLobby(lobbyCode.trim(), name.trim(), password))}
        >
          Join by code
        </button>
        <button type="button" className="btn" disabled={!connected} onClick={() => act(() => controlRoom.createLobby(name.trim(), password))}>
          Create
        </button>
      </div>
      <p className="hint">
        Searching asks the SyncStart server what exists. The play plan keeps polling tournament-hub on its own, and lobby state arrives as events.
      </p>
    </section>
  );
}
