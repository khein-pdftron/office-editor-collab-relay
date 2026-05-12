function createUser(userId, ws) {
  return {
    userId,
    username: String(userId),
    color: undefined,
    cursors: {},
    ws,
  };
}

function applyUserProfile(user, message) {
  user.username = message.username || message.name || user.username;
  user.color = message.color;
  user.cursors = message.cursors !== undefined ? message.cursors : user.cursors;
  return user;
}

module.exports = {
  createUser,
  applyUserProfile,
};
