
const RADIUS = 2.75;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type Status = "idle" | "running" | "pending" | "done" | "failed";

const TONE: Record<Status, string> = {
  idle: "rgb(var(--state-idle))",
  running: "rgb(var(--state-running))",
  pending: "rgb(var(--state-pending))",
  done: "rgb(var(--state-done))",
  failed: "rgb(var(--state-failed))",
};

const FILL: Partial<Record<Status, number>> = { idle: 0, running: 0.5, pending: 0.75 };

export function StatusIcon({ status, label }: { status: Status; label?: string }) {
  const solid = status === "done" || status === "failed";
  const fill = FILL[status] ?? 0;

  return (
    <svg viewBox="0 0 14 14" width="14" height="14" role="img" aria-label={label ?? status} style={{ color: TONE[status], flexShrink: 0 }}>
      {solid ? (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d={status === "done" ? "M4.3 7.2 6.2 9.1 9.8 4.9" : "M4.8 4.8 9.2 9.2 M9.2 4.8 4.8 9.2"}
            fill="none"
            stroke="rgb(var(--ui-surface))"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray={status === "idle" ? "2.2 2" : undefined} />
          {fill > 0 && (
            <circle
              cx="7"
              cy="7"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={RADIUS * 2}
              strokeDasharray={`${CIRCUMFERENCE * fill} ${CIRCUMFERENCE}`}
              transform="rotate(-90 7 7)"
            />
          )}
        </>
      )}
    </svg>
  );
}

type IconProps = { size?: number };

function frame(size: number, children: React.ReactNode) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const LanesIcon = ({ size = 18 }: IconProps) =>
  frame(
    size,
    <>
      <rect x="2.5" y="3.5" width="5" height="13" rx="1" />
      <rect x="12.5" y="3.5" width="5" height="13" rx="1" />
    </>,
  );

export const LobbiesIcon = ({ size = 18 }: IconProps) =>
  frame(
    size,
    <>
      <rect x="2.5" y="4" width="15" height="9.5" rx="1.5" />
      <path d="M7 16.5h6" />
    </>,
  );

export const OverlaysIcon = ({ size = 18 }: IconProps) =>
  frame(
    size,
    <>
      <circle cx="10" cy="10" r="2.2" />
      <path d="M5.6 5.6a6.2 6.2 0 0 0 0 8.8M14.4 5.6a6.2 6.2 0 0 1 0 8.8" />
    </>,
  );

export const OutboxIcon = ({ size = 18 }: IconProps) =>
  frame(
    size,
    <>
      <path d="M3 11.5v4a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-4" />
      <path d="M10 12.5V3M6.8 6.2 10 3l3.2 3.2" />
    </>,
  );

export const OptionsIcon = ({ size = 18 }: IconProps) =>
  frame(
    size,
    <>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.8v2M10 15.2v2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M2.8 10h2M15.2 10h2M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
    </>,
  );

export const SearchIcon = ({ size = 15 }: IconProps) =>
  frame(
    size,
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 17 17" />
    </>,
  );

export const SunIcon = ({ size = 13 }: IconProps) =>
  frame(
    size,
    <>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.6v2M10 15.4v2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M2.6 10h2M15.4 10h2M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </>,
  );

export const MoonIcon = ({ size = 13 }: IconProps) => frame(size, <path d="M15.5 11.4A6.2 6.2 0 0 1 8.6 4.5a6.2 6.2 0 1 0 6.9 6.9Z" />);

export const DesktopIcon = ({ size = 13 }: IconProps) =>
  frame(
    size,
    <>
      <rect x="2.8" y="4" width="14.4" height="9.6" rx="1.5" />
      <path d="M7 16.8h6" />
    </>,
  );

export const NetworkIcon = ({ size = 13 }: IconProps) =>
  frame(
    size,
    <>
      <path d="M3.4 7.6a9.3 9.3 0 0 1 13.2 0M6.1 10.4a5.5 5.5 0 0 1 7.8 0" />
      <circle cx="10" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </>,
  );

export const LockIcon = ({ size = 14 }: IconProps) =>
  frame(
    size,
    <>
      <rect x="4" y="8.6" width="12" height="7.4" rx="1.5" />
      <path d="M6.9 8.6V6.3a3.1 3.1 0 0 1 6.2 0v2.3" />
    </>,
  );

export const PaletteIcon = ({ size = 13 }: IconProps) =>
  frame(
    size,
    <>
      <path d="M10 2.8a7.2 7.2 0 0 0 0 14.4c1.1 0 1.8-.7 1.8-1.6 0-1.1-.9-1.4-.9-2.2 0-.7.6-1.2 1.3-1.2h1.3a3.4 3.4 0 0 0 3.4-3.4c0-3.3-3.1-6-6.9-6Z" />
      <circle cx="6.9" cy="9.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="6.1" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </>,
  );
