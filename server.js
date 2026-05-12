const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT || 3000);
const rooms = new Map();

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('Office Editor collaboration relay\n');
});

const wss = new WebSocketServer({ server });

function getRoomId(req) {
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/rooms\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : 'default';
}

function getRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function sendJson(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(room, senderId, data) {
  room.forEach((peer, peerId) => {
    if (peerId !== senderId && peer.ws.readyState === peer.ws.OPEN) {
      peer.ws.send(data);
    }
  });
}

function broadcastJson(room, senderId, message) {
  broadcast(room, senderId, JSON.stringify(message));
}

function parseJson(data) {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

wss.on('connection', (ws, req) => {
  const roomId = getRoomId(req);
  const room = getRoom(roomId);
  const clientId = crypto.randomUUID();
  const peer = {
    clientId,
    userId: clientId,
    name: clientId,
    color: undefined,
    ws,
  };

  room.set(clientId, peer);

  sendJson(ws, {
    type: 'hello',
    roomId,
    clientId,
    peers: [...room.values()]
      .filter((candidate) => candidate.clientId !== clientId)
      .map((candidate) => ({
        clientId: candidate.clientId,
        userId: candidate.userId,
        name: candidate.name,
        color: candidate.color,
      })),
  });

  ws.on('message', (data) => {
    const message = parseJson(data);
    if (message?.type === 'join') {
      peer.userId = message.userId || peer.userId;
      peer.name = message.name || peer.name;
      peer.color = message.color || peer.color;

      broadcastJson(room, clientId, {
        type: 'peer-joined',
        roomId,
        clientId,
        userId: peer.userId,
        name: peer.name,
        color: peer.color,
      });
    }

    broadcast(room, clientId, data);
  });

  ws.on('close', () => {
    room.delete(clientId);
    broadcastJson(room, clientId, {
      type: 'peer-left',
      roomId,
      clientId,
      userId: peer.userId,
      name: peer.name,
      color: peer.color,
    });

    if (room.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(port, () => {
  console.log(`Office Editor collaboration relay listening on ${port}`);
});
