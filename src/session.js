const sessions = new Map();

function getSession(sessionId) {
  return sessions.get(sessionId);
}

function hasSession(sessionId) {
  return sessions.has(sessionId);
}

function createSession(sessionId, document = null) {
  const session = {
    participants: new Map(),
    nextUserId: 1,
    nextMessageNumber: 1,
    document,
    messageStore: [],
  };
  sessions.set(sessionId, session);
  return session;
}

function assignSessionUserId(session) {
  const userId = session.nextUserId++;
  return userId;
}

function buildParticipantList(session, currentUserId) {
  return [...session.participants.values()]
    .filter((candidate) => candidate.userId !== currentUserId)
    .map((candidate) => ({
      userId: candidate.userId,
      username: candidate.username,
      color: candidate.color,
      cursors: candidate.cursors,
    }));
}

function appendMessage(session, message) {
  if (typeof session.nextMessageNumber !== 'number' || session.nextMessageNumber < 1) {
    session.nextMessageNumber = 1;
  }

  const stampedMessage =
    message.type === 'edit'
      ? {
          ...message,
          messageNumber: session.nextMessageNumber++,
        }
      : { ...message };
  session.messageStore.push(stampedMessage);

  if (session.messageStore.length > 1000) {
    session.messageStore.shift();
  }

  return stampedMessage;
}

function removePeerFromSession(sessionId, userId) {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  session.participants.delete(userId);
  if (session.participants.size === 0) {
    sessions.delete(sessionId);
  }

  return session;
}

module.exports = {
  getSession,
  hasSession,
  createSession,
  assignSessionUserId,
  buildParticipantList,
  appendMessage,
  removePeerFromSession,
};
