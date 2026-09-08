# Lobby Control Room

The venue side of a tournament. It holds the SyncStart connections to the
cabinets in the room, reads the play plan Tournament Hub publishes, and reports
finished runs back — with a persistent outbox, so play continues while the hub
is unreachable.

It is a separate product from Tournament Hub. Nothing here imports anything of
the hub's: the only thing crossing the boundary is the versioned HTTP contract
the hub publishes under `/v1` and one control-room key.

## What is in here

| Workspace | What it is |
| --- | --- |
| `apps/api` | The venue's backend: SyncStart connections, the play-plan poller, the outbox |
| `apps/frontend` | The operator's console — lanes, lobbies, outbox, options, and an overlay OBS can open |
| `packages/syncstart-protocol` | The SyncStart WebSocket protocol client |
| `tools/syncstart-simulator` | A deterministic SyncStart server for local runs and tests |

## Requirements

- Node.js 22 or later, and npm
- Docker and Docker Compose, for the containerized stack
- A running Tournament Hub, and a control-room key generated on a tournament's
  configuration page there

## Run it with Docker

```bash
cp .env.example .env
```

Put the control-room key in `.env` as `CONTROL_ROOM_KEY`, then:

```bash
npm run up
```

The console is at `http://localhost:8080`. Everything else has a working
default: the bundled SyncStart simulator comes up with the stack, so a fresh
clone has something to connect to before any cabinet exists.

```bash
npm run status
npm run logs
npm run down
```

`npm run reset` throws away the outbox volume and starts again.

## Run it from a shell

```bash
npm ci
npm run build
npm run dev
```

That runs the backend on `http://localhost:3002`, the console on
`http://localhost:5173` (proxying `/api` to the backend), and the SyncStart
simulator on `ws://localhost:19000`. It reads the same `.env`.

## Verify it

```bash
npm run lint
npm run test
```

## Where the settings live

`.env` is only the first run. Once the control room is up, the console's
Options page owns the SyncStart address, the poll interval, and whether the
console stays on this machine or opens to the venue network — those are written
to the outbox volume and survive a restart.

The control-room key is the exception: it stays in the environment and never
reaches a browser. The console asks for a passphrase only when the venue has
been opened to the network; on loopback there is nothing to protect it from.

Operational detail — ports, the outbox, the overlay, recovery — is in
[docs/OPERATIONS.md](docs/OPERATIONS.md).
