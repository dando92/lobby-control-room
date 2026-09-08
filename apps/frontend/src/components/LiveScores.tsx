import type { Judgments, LivePlayer } from "../api";

const COUNTS: Array<{ key: keyof Judgments; colour: string }> = [
  { key: "fantasticPlus", colour: "rgb(var(--judgment-fantastic-plus))" },
  { key: "fantastics", colour: "rgb(var(--judgment-fantastic))" },
  { key: "excellents", colour: "rgb(var(--judgment-excellent))" },
  { key: "greats", colour: "rgb(var(--judgment-great))" },
  { key: "decents", colour: "rgb(var(--judgment-decent))" },
  { key: "wayOffs", colour: "rgb(var(--judgment-way-off))" },
  { key: "misses", colour: "rgb(var(--judgment-miss))" },
];

export default function LiveScores({ players, side }: { players: LivePlayer[]; side?: (player: LivePlayer, index: number) => string }) {
  return (
    <div className="live">
      {players.map((player, index) => (
        <div key={player.playerId || player.playerName} className={`live__row ${player.isFailed ? "live__row--failed" : ""}`}>
          <span className="live__side">{side ? side(player, index) : `P${index + 1}`}</span>
          <span className="live__name">{player.playerName}</span>
          <span className="live__counts">
            {COUNTS.filter(({ key }) => (player.judgments?.[key] ?? 0) > 0).map(({ key, colour }) => (
              <span key={key} style={{ color: colour }}>
                {player.judgments?.[key]}
              </span>
            ))}
          </span>
          <span className="spacer" />
          <span className="live__score">{player.exScore != null ? `${player.exScore.toFixed(2)}%` : player.score}</span>
        </div>
      ))}
    </div>
  );
}
