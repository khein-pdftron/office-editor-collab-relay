const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT || 3000);
const sessions = new Map();

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

function getSessionId(req) {
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/session\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : 'default';
}

function getSession(sessionId) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = new Map();
    sessions.set(sessionId, session);
  }
  return session;
}

function sendJson(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(session, senderId, data) {
  session.forEach((peer, peerId) => {
    if (peerId !== senderId && peer.ws.readyState === peer.ws.OPEN) {
      peer.ws.send(data);
    }
  });
}

function broadcastJson(session, senderId, message) {
  broadcast(session, senderId, JSON.stringify(message));
}

function parseJson(data) {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

wss.on('connection', (ws, req) => {
  const sessionId = getSessionId(req);
  const session = getSession(sessionId);
  const clientId = crypto.randomUUID();
  const peer = {
    clientId,
    userId: clientId,
    name: clientId,
    color: undefined,
    ws,
  };

  session.set(clientId, peer);

  sendJson(ws, {
    type: 'hello',
    sessionId,
    clientId,
    peers: [...session.values()]
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

      broadcastJson(session, clientId, {
        type: 'peer-joined',
        sessionId,
        clientId,
        userId: peer.userId,
        name: peer.name,
        color: peer.color,
      });
    }

    broadcast(session, clientId, data);
  });

  ws.on('close', () => {
    session.delete(clientId);
    broadcastJson(session, clientId, {
      type: 'peer-left',
      sessionId,
      clientId,
      userId: peer.userId,
      name: peer.name,
      color: peer.color,
    });

    if (session.size === 0) {
      sessions.delete(sessionId);
    }
  });
});

server.listen(port, () => {
  console.log(`Office Editor collaboration relay listening on ${port}`);
});
