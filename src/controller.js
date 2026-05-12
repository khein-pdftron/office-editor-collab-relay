const crypto = require('crypto');
const { parseJson, sendMessage, broadcastMessage } = require('./util');
const {
  getSession,
  hasSession,
  createSession,
  appendMessage,
  removePeerFromSession,
} = require('./session');

function handleInit({ ws, message, user, userId, currentSessionId, setCurrentSessionId }) {
  if (message.document === undefined) {
    sendMessage(ws, {
      type: 'error',
      reason: 'init requires a document payload',
    });
    return true;
  }

  if (currentSessionId) {
    sendMessage(ws, {
      type: 'error',
      reason: 'client already joined a session',
    });
    return true;
  }

  const sessionId = crypto.randomUUID();
  if (hasSession(sessionId)) {
    sendMessage(ws, {
      type: 'error',
      reason: 'sessionId already exists',
      sessionId,
    });
    return true;
  }

  user.username = message.username || message.name || user.username;
  user.color = message.color;
  user.cursors = message.cursors !== undefined ? message.cursors : user.cursors;

  const session = createSession(sessionId, message.document);
  session.participants.set(userId, user);
  setCurrentSessionId(sessionId);

  sendMessage(ws, {
    type: 'session-ack',
    sessionId,
    userId,
    document: session.document,
    messages: session.messageStore,
  });

  appendMessage(session, {
    type: 'peer-joined',
    sessionId,
    userId: user.userId,
    username: user.username,
    color: user.color,
    cursors: user.cursors,
  });

  return true;
}

function handleJoin({ ws, message, user, userId, currentSessionId, setCurrentSessionId }) {
  const sessionId = message.sessionId;
  if (!sessionId) {
    sendMessage(ws, {
      type: 'error',
      reason: 'join requires sessionId',
    });
    return true;
  }

  if (currentSessionId && currentSessionId !== sessionId) {
    sendMessage(ws, {
      type: 'error',
      reason: 'client already joined a different session',
      sessionId: currentSessionId,
    });
    return true;
  }

  const session = getSession(sessionId);
  if (!session) {
    sendMessage(ws, {
      type: 'error',
      reason: 'Session not found.',
      sessionId,
    });
    return true;
  }

  user.username = message.username || message.name || user.username;
  user.color = message.color;
  user.cursors = message.cursors !== undefined ? message.cursors : user.cursors;

  session.participants.set(userId, user);
  setCurrentSessionId(sessionId);

  sendMessage(ws, {
    type: 'session-ack',
    sessionId,
    userId,
    document: session.document,
    messages: session.messageStore,
  });

  const joinedEvent = appendMessage(session, {
    type: 'peer-joined',
    sessionId,
    userId: user.userId,
    username: user.username,
    color: user.color,
    cursors: user.cursors,
  });

  broadcastMessage(
    session,
    joinedEvent,
    userId,
  );

  return true;
}

function handleLeave({ userId, user, currentSessionId }) {
  if (!currentSessionId) {
    return false;
  }

  const session = getSession(currentSessionId);
  if (!session) {
    return false;
  }

  const leftEvent = appendMessage(session, {
    type: 'peer-left',
    sessionId: currentSessionId,
    userId: user.userId,
    username: user.username,
    color: user.color,
    cursors: user.cursors,
  });

  removePeerFromSession(currentSessionId, userId);
  broadcastMessage(session, leftEvent, userId);

  return true;
}

function handleIncomingMessage(context) {
  const {
    ws,
    data,
    userId,
    user,
    getCurrentSessionId,
    setCurrentSessionId,
  } = context;

  const rawData = data.toString();
  const message = parseJson(data);
  if (!message) {
    return;
  }

  const currentSessionId = getCurrentSessionId();

  if (message.type === 'init') {
    handleInit({ ws, message, user, userId, currentSessionId, setCurrentSessionId });
    return;
  }

  if (message.type === 'join') {
    handleJoin({ ws, message, user, userId, currentSessionId, setCurrentSessionId });
    return;
  }

  const activeSessionId = getCurrentSessionId();
  if (!activeSessionId) {
    sendMessage(ws, {
      type: 'error',
      reason: 'send init or join before other messages',
    });
    return;
  }

  const session = getSession(activeSessionId);
  if (!session) {
    sendMessage(ws, {
      type: 'error',
      reason: 'active session not found',
      sessionId: activeSessionId,
    });
    setCurrentSessionId(null);
    return;
  }

  // Any non-init/join packet is treated as a chat/message payload.
  const stampedMessage = appendMessage(session, {
    type: 'edit',
    sessionId: activeSessionId,
    userId: user.userId,
    payload: message.payload !== undefined
      ? message.payload
      : (message.blob !== undefined ? message.blob : message),
    at: Date.now(),
  });

  sendMessage(ws, stampedMessage);
  broadcastMessage(session, stampedMessage, userId);
}

module.exports = {
  handleIncomingMessage,
  handleLeave,
};
