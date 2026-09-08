import { useState } from "react";
import { controlRoom, rememberPassphrase, storedPassphrase, type ConsoleState } from "../api";
import { DesktopIcon, LockIcon, MoonIcon, NetworkIcon, PaletteIcon, SunIcon } from "../components/Glyphs";
import { ACCENT_PRESETS, DEFAULT_ACCENT_COLOR, normalizeAccentColor, useAccentColor } from "../lib/accentColor";
import { THEME_PREFERENCES, useThemePreference, type ThemePreference } from "../lib/themePreference";
import { time } from "../components/Shell";
import type { Act } from "./types";

const THEME_ICON: Record<ThemePreference, (props: { size?: number }) => JSX.Element> = { light: SunIcon, dark: MoonIcon, system: DesktopIcon };

export default function OptionsPage({ state, act }: { state: ConsoleState; act: Act }) {
  const [theme, chooseTheme] = useThemePreference();
  const [accent, chooseAccent] = useAccentColor();
  const [syncstartUrl, setSyncstartUrl] = useState(state.settings.syncstartUrl);
  const [passphrase, setPassphrase] = useState(state.settings.operatorPassword);
  const [pollInterval, setPollInterval] = useState(String(state.settings.pollIntervalSeconds));
  const onNetwork = state.settings.reach === "venue-network";

  return (
    <>
      <header className="row">
        <h1 className="h1">Options</h1>
      </header>

      <section className="section">
        <div className="section__head">
          <MoonIcon size={15} />
          <h2 style={{ margin: 0, fontSize: 14 }}>Appearance</h2>
        </div>
        <div className="section__body">
          <div style={{ display: "grid", gap: 9 }}>
            <p className="hint">Applies to this device only. “System” follows the setting of your operating system.</p>
            <div className="row">
              {THEME_PREFERENCES.map((option) => {
                const Icon = THEME_ICON[option];

                return (
                  <button key={option} type="button" className={`seg capitalize ${theme === option ? "is-on" : ""}`} aria-pressed={theme === option} onClick={() => chooseTheme(option)}>
                    <Icon />
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 9, borderTop: "1px solid rgb(var(--ui-separator))", paddingTop: 13 }}>
            <div className="row" style={{ gap: 8, fontWeight: 600 }}>
              <PaletteIcon />
              <h3 style={{ margin: 0, fontSize: 14 }}>Accent colour</h3>
            </div>
            <p className="hint">
              The one colour the interface carries: selection bars and the ring around whatever the keyboard is on. The rest of the chrome stays neutral,
              which is what keeps this colour readable as a choice.
            </p>
            <div className="row">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.name}
                  aria-label={preset.name}
                  aria-pressed={accent === preset.value}
                  style={{ background: preset.value }}
                  className={`swatch ${accent === preset.value ? "is-on" : ""}`}
                  onClick={() => chooseAccent(preset.value)}
                />
              ))}
              <span className="divider-y" aria-hidden />
              <label className="swatch-custom">
                <input
                  type="color"
                  value={accent.toLowerCase()}
                  aria-label="Custom accent colour"
                  onChange={(event) => chooseAccent(normalizeAccentColor(event.target.value) ?? DEFAULT_ACCENT_COLOR)}
                />
                Custom
              </label>
              <span className="mono">{accent}</span>
              {accent !== DEFAULT_ACCENT_COLOR && (
                <button type="button" className="link" onClick={() => chooseAccent(DEFAULT_ACCENT_COLOR)}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <NetworkIcon size={15} />
          <h2 style={{ margin: 0, fontSize: 14 }}>SyncStart server</h2>
        </div>
        <div className="section__body">
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }} htmlFor="syncstart-url">
              Address
            </label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input id="syncstart-url" className="field" style={{ flex: 1 }} value={syncstartUrl} onChange={(event) => setSyncstartUrl(event.target.value)} />
              <button
                type="button"
                className="btn btn--primary"
                disabled={syncstartUrl === state.settings.syncstartUrl}
                onClick={() => act(() => controlRoom.saveSettings({ syncstartUrl: syncstartUrl.trim() }))}
              >
                Save
              </button>
            </div>
            <p className="hint">
              Kept in this machine's settings file beside the outbox, not in the environment, so a venue is repointed without restarting anything. The
              default is GrooveStats' public server, ws://syncservice.groovestats.com:1337. Saving a new address releases the lobbies this venue holds.
            </p>
          </div>

          <div className="row" style={{ borderTop: "1px solid rgb(var(--ui-separator))", paddingTop: 13 }}>
            <span className={`dot ${state.server.isConnected ? "dot--connected" : ""}`} />
            <span>{state.server.isConnected ? "Connected" : "Not connected"}</span>
            <span className="spacer" />
            <button type="button" className="btn" onClick={() => act(() => controlRoom.connectServer())}>
              Connect
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <LockIcon size={15} />
          <h2 style={{ margin: 0, fontSize: 14 }}>This venue</h2>
        </div>
        <div className="section__body">
          <div style={{ display: "grid", gap: 9 }}>
            <span style={{ fontWeight: 600 }}>Reachable from</span>
            <div className="row">
              <button
                type="button"
                className={`seg ${onNetwork ? "" : "is-on"}`}
                onClick={() => act(() => controlRoom.saveSettings({ reach: "this-machine" }))}
              >
                <DesktopIcon />
                This machine
              </button>
              <button
                type="button"
                className={`seg ${onNetwork ? "is-on" : ""}`}
                onClick={() => act(() => controlRoom.saveSettings({ reach: "venue-network", operatorPassword: passphrase }))}
              >
                <NetworkIcon />
                The venue network
              </button>
            </div>
            <p className="hint">
              Bound to 127.0.0.1, nothing outside this machine can reach the console and there is nothing to protect it from. Opening it to the network is
              what a phone in the room needs — and the moment it is open, the passphrase below stops being optional. The change takes effect when the
              control room restarts.
            </p>
            <div className="row" style={{ flexWrap: "nowrap", opacity: onNetwork ? 1 : 0.5 }}>
              <input
                className="field"
                type="password"
                autoComplete="off"
                style={{ flex: 1 }}
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={async () => {
                  await act(() => controlRoom.saveSettings({ operatorPassword: passphrase }));
                  rememberPassphrase(passphrase);
                }}
              >
                Save
              </button>
            </div>
            {onNetwork && storedPassphrase() !== state.settings.operatorPassword && (
              <p className="hint">This browser is holding a different passphrase; saving here does not change what it sends.</p>
            )}
          </div>

          <div style={{ display: "grid", gap: 8, borderTop: "1px solid rgb(var(--ui-separator))", paddingTop: 13 }}>
            <div className="row">
              <span className={`dot ${state.unreachableSince ? "dot--failed" : "dot--live"}`} />
              <span style={{ fontWeight: 600 }}>{state.session ? `Paired with ${state.session.name}` : "Not paired"}</span>
            </div>
            <div className="hint">
              plan v{state.planVersion} · {state.unreachableSince ? `unreachable since ${time(state.unreachableSince)}` : `read ${time(state.reachedAt)}`}
            </div>
            <p className="hint">
              The tournament key stays in this machine's environment and never reaches this page. Replacing it means generating a new one on the
              tournament's configuration page and restarting the venue.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <DesktopIcon size={15} />
          <h2 style={{ margin: 0, fontSize: 14 }}>Reading the plan</h2>
        </div>
        <div className="section__body">
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }} htmlFor="poll-interval">
              Poll interval
            </label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input id="poll-interval" className="field" type="number" min="1" max="60" style={{ width: 110 }} value={pollInterval} onChange={(event) => setPollInterval(event.target.value)} />
              <span className="muted">seconds</span>
              <button
                type="button"
                className="btn btn--primary"
                disabled={Number(pollInterval) === state.settings.pollIntervalSeconds}
                onClick={() => act(() => controlRoom.saveSettings({ pollIntervalSeconds: Number(pollInterval) }))}
              >
                Save
              </button>
            </div>
            <p className="hint">
              The one thing still polled. Everything a lobby does arrives as an event and redraws at once; the play plan is pulled, because a venue must
              keep playing while tournament-hub is unreachable.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
