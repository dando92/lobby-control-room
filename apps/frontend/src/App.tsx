import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { rememberPassphrase, storedPassphrase } from "./api";
import Shell from "./components/Shell";
import LanesPage from "./pages/LanesPage";
import LobbiesPage from "./pages/LobbiesPage";
import OptionsPage from "./pages/OptionsPage";
import OutboxPage from "./pages/OutboxPage";
import OverlayPage from "./pages/OverlayPage";
import OverlaysPage from "./pages/OverlaysPage";
import { useConsole } from "./useConsole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/overlay/live-scoreboard" element={<OverlayPage />} />
        <Route path="*" element={<Console />} />
      </Routes>
    </BrowserRouter>
  );
}

function Console() {
  const { state, error, locked, live, act, dismissError } = useConsole();

  if (locked) {
    return <PassphraseGate />;
  }

  if (!state) {
    return <p className="app muted" style={{ padding: 24 }}>Reading the control room…</p>;
  }

  return (
    <Shell state={state} live={live}>
      {state.unreachableSince && (
        <div className="notice">
          Tournament hub has been unreachable since {new Date(state.unreachableSince).toLocaleTimeString()}. The lanes below are the last plan this
          venue read, and play continues: what is reported now waits in the outbox.
        </div>
      )}

      {error && (
        <div className="notice notice--failed">
          <div className="row">
            <span>{error}</span>
            <span className="spacer" />
            <button type="button" className="btn" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/lanes" replace />} />
        <Route path="/lanes" element={<LanesPage state={state} act={act} />} />
        <Route path="/lobbies" element={<LobbiesPage state={state} act={act} />} />
        <Route path="/overlays" element={<OverlaysPage state={state} />} />
        <Route path="/outbox" element={<OutboxPage state={state} act={act} />} />
        <Route path="/options" element={<OptionsPage state={state} act={act} />} />
        <Route path="*" element={<Navigate to="/lanes" replace />} />
      </Routes>
    </Shell>
  );
}

function PassphraseGate() {
  const [passphrase, setPassphrase] = useState(storedPassphrase());

  return (
    <form
      className="gate"
      onSubmit={(event) => {
        event.preventDefault();
        rememberPassphrase(passphrase);
        window.location.reload();
      }}
    >
      <h1 className="h1">Lobby control room</h1>
      <p className="hint">This venue is reachable from the network, so it asks for its passphrase. The tournament key never leaves the machine behind this page.</p>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="hint">Venue passphrase</span>
        <input className="field" type="password" value={passphrase} autoFocus onChange={(event) => setPassphrase(event.target.value)} />
      </label>
      <button type="submit" className="btn btn--primary">
        Unlock
      </button>
    </form>
  );
}
