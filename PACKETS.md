# Packet Reference

Sessions are created and joined using protocol messages (`init` and `join`).

## Connection

Server -> Client: `connected`

```json
{
  "type": "connected",
  "ready": true
}
```

## Session Init Flow

Client -> Server: `init`

```json
{
  "type": "init",
  "document": "<base64-encoded-document>",
  "username": "Alice",
  "color": "#D93025",
  "cursors": "<cursors>"
}
```

Server -> Client: `session-ack` (shared with join)

```json
{
  "type": "session-ack",
  "sessionId": "<new-session-id>",
  "userId": 1,
  "document": "<base64-encoded-document>",
  "messages": []
}
```

## Session Join Flow

Client -> Server: `join`

```json
{
  "type": "join",
  "sessionId": "<sessionId>",
  "username": "Alice",
  "color": "#D93025",
  "cursors": "<cursors>"
}
```

Server -> Client: `session-ack` (shared with init)

```json
{
  "type": "session-ack",
  "sessionId": "<session-id>",
  "userId": 2,
  "document": "<base64-encoded-document>",
  "messages": [
    {
      "type": "peer-joined",
      "sessionId": "<session-id>",
      "userId": 1,
      "username": "Bob",
      "color": "#2E7D32",
      "cursors": "<cursors>"
    },
    {
      "type": "edit",
      "userId": 1,
      "payload": "<payload>",
      "at": 1715512345688,
      "messageNumber": 2
    }
  ]
}
```

Server -> Other Clients: `peer-joined`

```json
{
  "type": "peer-joined",
  "sessionId": "<session-id>",
  "userId": 2,
  "username": "Alice",
  "color": "#D93025",
  "cursors": "<cursors>"
}
```

Server -> Other Clients: `peer-left`

```json
{
  "type": "peer-left",
  "sessionId": "<session-id>",
  "userId": 2,
  "username": "Alice",
  "color": "#D93025",
  "cursors": "<cursors>"
}
```

## Edit Flow

Client -> Server: edit payload

```json
{
  "type": "edit",
  "payload": "<payload>"
}
```

Server -> Sender + Other Clients: stamped edit payload

```json
{
  "type": "edit",
  "sessionId": "<session-id>",
  "userId": 1,
  "payload": "<payload>",
  "messageNumber": 2
}
```

## Error Flow

Server -> Client: `error`

```json
{
  "type": "error",
  "reason": "join requires sessionId"
}
```

## Notes

- `userId` is assigned by the server during `init`/`join` (returned in `session-ack`), is unique within each session, starts at `1` for each session, and is not client-settable.
- `username` and `color` are read from the client `init` or `join` payload.
- `cursors` is read from the client `init` or `join` payload and included in peer-related packets.
- `document` is base64-encoded in `init` and `session-ack`.
- `messages` replay contains `peer-joined`, `peer-left`, and `edit` events.
- Sessions remain in memory when participant count reaches zero.
- Only `edit` events are stamped with `messageNumber`.
- Emitted `edit` events include `sessionId`.
- `messageNumber` is assigned by the server as a monotonic per-session sequence for `edit` events.
- When a client creates or joins a session, it receives current `document` and previous `messages` in `session-ack`.
