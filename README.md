# Office Editor Collaboration Relay

Hackathon WebSocket relay for Office Editor cursor presence.

## Run locally

```sh
cd collab-relay
npm install
npm start
```

The relay listens on `PORT` or `3000`.

Use a room URL from the Office Editor env:

```txt
http://localhost:8090/envs/office-editor/index.html?room=demo-doc&user=alice&name=Alice
```

By default the env connects to:

```txt
ws://localhost:3000/rooms/demo-doc
```

## Protocol

Clients connect to:

```txt
ws://host:3000/rooms/<roomId>
```

The server forwards every client packet unchanged to the other clients in the same room.

The server also sends:

```json
{ "type": "hello", "roomId": "demo", "clientId": "...", "peers": [] }
{ "type": "peer-joined", "roomId": "demo", "userId": "alice", "name": "Alice" }
{ "type": "peer-left", "roomId": "demo", "userId": "alice", "name": "Alice" }
```

Cursor packets are produced by the client:

```json
{
  "type": "cursor",
  "roomId": "demo",
  "userId": "alice",
  "name": "Alice",
  "color": "#D93025",
  "location": {
    "pageIndex": 0,
    "streamId": 1,
    "paragraphId": 123,
    "offset": 4
  }
}
```
