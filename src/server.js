const http = require('http');
const { WebSocketServer } = require('ws');
const { logEvent, sendMessage } = require('./util');
const { handleIncomingMessage, handleLeave } = require('./controller');

const port = Number(process.env.PORT || 3000);

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
  let currentSessionId = null;
  let user = null;
  let userId = null;


  logEvent('connection', {
    remoteAddress: req.socket.remoteAddress,
  });


  sendMessage(ws, {
    type: 'connected',
    ready: true,
  });


  ws.on('message', (data) => {
    const rawData = data.toString();
    logEvent('message', { userId, sessionId: currentSessionId, data: rawData });

    handleIncomingMessage({
      ws,
      data,
      getCurrentSessionId: () => currentSessionId,
      setCurrentSessionId: (nextSessionId) => {
        currentSessionId = nextSessionId;
      },
      setUser: (u, id) => {
        user = u;
        userId = id;
      },
      getUser: () => user,
      getUserId: () => userId,
    });
  });


  ws.on('close', () => {
    logEvent('close', { userId, sessionId: currentSessionId });
    if (user && userId && currentSessionId) {
      handleLeave({
        userId,
        user,
        currentSessionId,
      });
    }
  });

  ws.on('error', (err) => {
    logEvent('error', { userId, sessionId: currentSessionId, error: err.message });
  });
});

server.listen(port, () => {
  console.log(`Office Editor collaboration relay listening on ${port}`);
});
