import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LanesIcon, LobbiesIcon, OptionsIcon, OutboxIcon, OverlaysIcon } from "./Glyphs";
import type { ConsoleState } from "../api";

const DESTINATIONS = [
  { to: "/lanes", label: "Lanes", Icon: LanesIcon },
  { to: "/lobbies", label: "Lobbies", Icon: LobbiesIcon },
  { to: "/overlays", label: "Overlays", Icon: OverlaysIcon },
  { to: "/outbox", label: "Outbox", Icon: OutboxIcon },
  { to: "/options", label: "Options", Icon: OptionsIcon },
] as const;

export default function Shell({ state, live, children }: { state: ConsoleState; live: boolean; children: ReactNode }) {
  const waiting = state.queue.length;
  const navigate = useNavigate();

  return (
    <div className="shell">
      <nav className="rail">
        <button type="button" className="rail__brand" onClick={() => navigate("/")}>
          <img src="/mark.svg" alt="" className="rail__mark" />
          <h2 className="rail__name">
            Lobby
            <br />
            Control room
          </h2>
        </button>

        <div className="rail__nav">
          {DESTINATIONS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rail__item ${isActive ? "is-active" : ""}`}>
              <Icon />
              <span>{label}</span>
              {to === "/outbox" && waiting > 0 && (
                <>
                  <span className="spacer" />
                  <span className="count">{waiting}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="rail__status">
          <Status
            tone={state.unreachableSince ? "failed" : "live"}
            title={state.session?.name ?? "Not paired"}
            detail={state.unreachableSince ? `unreachable since ${time(state.unreachableSince)}` : `plan v${state.planVersion} · read ${time(state.reachedAt)}`}
          />
          <Status
            tone={state.server.isConnected ? "connected" : "idle"}
            title="SyncStart"
            detail={state.server.isConnected ? `connected · ${state.lobbies.length} lobbies` : "not connected"}
          />
          {!live && <p className="hint">Live updates are reconnecting.</p>}
        </div>
      </nav>

      <main className="content">{children}</main>

      <nav className="bottom-nav">
        {DESTINATIONS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-nav__item ${isActive ? "is-active" : ""}`}>
            <Icon size={20} />
            <span>{label}</span>
            {to === "/outbox" && waiting > 0 && (
              <span className="count" style={{ position: "absolute", top: 5, left: "56%" }}>
                {waiting}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Status({ tone, title, detail }: { tone: "live" | "connected" | "idle" | "failed"; title: string; detail: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span className={`dot ${tone === "idle" ? "" : `dot--${tone}`}`} />
      <div style={{ minWidth: 0 }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div className="hint">{detail}</div>
      </div>
    </div>
  );
}

export function time(value: string | null): string {
  return value ? new Date(value).toLocaleTimeString() : "never";
}
