# Operations

## Ports

| Port | What answers |
| --- | --- |
| `8080` | The operator's console (nginx), published per `CONSOLE_BIND` |
| `3002` | The control-room backend — private to the Compose network under Docker |
| `19000` | The bundled SyncStart simulator |
| `5173` | The console's Vite dev server, when running from a shell |

Under Docker the backend is not published at all. The console's nginx proxies
`/api/` to it, so the browser sees one origin and the control-room key never
has to be known by a browser.

## Health

```bash
curl http://localhost:3002/health/live
curl http://localhost:3002/health/ready
```

Readiness does not depend on Tournament Hub being reachable — a venue whose hub
is down is still a venue that can play. `ready` reports when the hub was last
reached and, if it is unreachable now, since when.

## The outbox

Finished runs are written to a queue on disk before they are sent, and an entry
is removed only once the hub has accepted every run in it. A partial acceptance
stays queued with the refusals recorded against it.

Under Docker the queue lives in the `control-room-data` volume at
`/data/outbox`, next to `venue.json`. From a shell it is `./data/outbox`
relative to the working directory, overridable with `CONTROL_ROOM_QUEUE_DIR`.

Inspect it from the console's Outbox page, or directly:

```bash
docker compose exec api ls /data/outbox
```

`npm run reset` deletes the volume — the queued runs and the venue settings go
with it.

## Opening the console to the room

By default the console is published on `127.0.0.1`, so it is this machine's.
To drive it from a phone at the venue, set both of these and bring the stack
back up:

```
CONSOLE_BIND=0.0.0.0
CONTROL_ROOM_OPERATOR_PASSWORD=<something you will type on a phone>
```

The reach setting is also editable from the console's Options page, which
refuses to open the venue to the network without a passphrase.

## The overlay

`http://localhost:8080/overlay/live-scoreboard` is a standalone page with a
transparent background, meant to be added to OBS as a browser source. It takes
no passphrase gate of its own — anyone who can reach the console can open it.

## SyncStart

`SYNCSTART_URL` decides what the venue connects to:

- `ws://syncstart-simulator:19000` — the bundled simulator (default)
- `ws://syncservice.groovestats.com:1337` — the public GrooveStats service
- a legacy UDP-broadcast ITGmania cabinet, via the separate `syncstart-bridge`
  project, which presents one as a SyncStart lobby

It can be changed from the console's Options page without a restart.

## Recovery

The control room keeps no authoritative state. If it is lost, bring it back up
with the same key and the same volume; what it had not yet reported is in the
outbox, and what it needs to do next it reads from the hub. If the volume is
also lost, the runs that had not been accepted are gone and have to be entered
in Tournament Hub by hand.
