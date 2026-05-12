# Office Editor Collaboration Relay

Hackathon WebSocket relay for Office Editor cursor presence.

## Run locally

```sh
cd office-editor-collab-relay
npm install
npm start
```

The relay listens on `PORT` or `3000`.

Use a URL from the Office Editor env:

```txt
http://localhost:8090/envs/office-editor/index.html?session=demo-doc&user=alice&name=Alice
```

By default the env connects to:

```txt
ws://localhost:3000
```

## Protocol

Clients connect to:

```txt
ws://host:3000
```

Sessions are created and joined using protocol messages (`init` and `join`).

Full packet definitions are in [PACKETS.md](PACKETS.md).
