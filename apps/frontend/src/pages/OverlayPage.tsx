import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import LiveScores from "../components/LiveScores";
import { useConsole } from "../useConsole";
import { matchOf } from "./OverlaysPage";

export default function OverlayPage() {
  const [params] = useSearchParams();
  const { state } = useConsole();
  const lobbyCode = (params.get("lobby") ?? "").toUpperCase();

  useEffect(() => {
    document.body.classList.add("overlay");

    return () => document.body.classList.remove("overlay");
  }, []);

  const lobby = state?.lobbies.find((candidate) => candidate.lobbyCode === lobbyCode) ?? null;
  const players = lobby?.telemetry?.players ?? [];
  if (!state || players.length === 0) {
    return null;
  }

  return (
    <div className="overlay__card">
      <div>
        <div style={{ color: "rgb(var(--live-text-mute))", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>{matchOf(state, lobby?.scheduleId ?? null)}</div>
        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700 }}>{lobby?.telemetry?.songTitle}</div>
      </div>
      <LiveScores players={players} />
    </div>
  );
}
