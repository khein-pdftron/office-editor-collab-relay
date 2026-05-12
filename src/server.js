const http = require('http');
const { WebSocketServer } = require('ws');
const { logEvent, sendMessage } = require('./util');
const { handleIncomingMessage, handleLeave } = require('./controller');

const port = Number(process.env.PORT || 3000);
let nextUserId = 1;

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

wss.on('connection', (ws, req) => {
  const userId = nextUserId++;
  let currentSessionId = null;
  const user = {
    userId,
    username: String(userId),
    color: undefined,
    cursors: {},
    ws,
  };

  logEvent('connection', {
    remoteAddress: req.socket.remoteAddress,
    userId,
  });

  sendMessage(ws, {
    type: 'connected',
    userId,
    ready: true,
  });

  ws.on('message', (data) => {
    const rawData = data.toString();
    logEvent('message', { userId, sessionId: currentSessionId, data: rawData });
    
    handleIncomingMessage({
      ws,
      data,
      userId,
      user,
      getCurrentSessionId: () => currentSessionId,
      setCurrentSessionId: (nextSessionId) => {
        currentSessionId = nextSessionId;
      },
    });
  });

  ws.on('close', () => {
    logEvent('close', { userId, sessionId: currentSessionId });

    handleLeave({
      userId,
      user,
      currentSessionId,
    });
  });

  ws.on('error', (err) => {
    logEvent('error', { userId, sessionId: currentSessionId, error: err.message });
  });
});

server.listen(port, () => {
  console.log(`Office Editor collaboration relay listening on ${port}`);
});
