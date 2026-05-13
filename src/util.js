function parseJson(data) {
	try {
		return JSON.parse(data.toString());
	} catch {
		return null;
	}
}

function logEvent(event, details) {
  const time = new Date().toISOString();
  const isWarn = event === 'warn';
  const prefix = isWarn ? '\x1b[31m' : '';
  const suffix = isWarn ? '\x1b[0m' : '';
  console.log(`${prefix}[${time}] [${event}]${suffix}`, details);
}

function sendMessage(ws, message) {
  if (ws.readyState !== ws.OPEN) {
    return;
  }

  if (typeof message === 'string' || Buffer.isBuffer(message)) {
    ws.send(message);
    return;
  }

  ws.send(JSON.stringify(message));
}

function broadcastMessage(session, message, senderId) {
  session.participants.forEach((user, userId) => {
    if (!senderId || userId !== senderId) {
      sendMessage(user.ws, message);
    }
  });
}

module.exports = {
	parseJson,
	logEvent,
    sendMessage,
    broadcastMessage,
};
