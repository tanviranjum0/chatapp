const redisClient = require("../redis");

module.exports.authorizeUser = (socket, next) => {
  if (!socket.request.session || !socket.request.session.user) {
    console.log("Bad Request");
    return next(new Error("Unauthorized"));
  } else {
    socket.user = { ...socket.request.session.user };
    redisClient.hset(
      `userid:${socket.user.username}`,
      "userid",
      socket.user.userid
    );
    next();
  }
};

module.exports.initializeUser = async (socket) => {
  socket.user = { ...socket.request.session.user };
  socket.join(socket.user.userid);
  await redisClient.hset(
    `userid:${socket.user.username}`,
    "userid",
    socket.user.userid,
    "connected",
    true
  );
  const friendList = await redisClient.lrange(
    `friends:${socket.user.username}`,
    0,
    -1
  );
  const parsedFriendList = await parseFriendList(friendList);
  const friendRooms = await parsedFriendList.map((friend) => friend.userid);
  if (friendRooms.length > 0)
    await socket.to(friendRooms).emit("connected", true, socket.user.username);
  await socket.emit("friends", parsedFriendList);

  const messageQuery = await redisClient.lrange(
    `chat:${socket.user.userid}`,
    0,
    -1
  );
  const messages = await messageQuery.map((mshStr) => {
    const parsedStr = mshStr.split(".");
    return { to: parsedStr[0], from: parsedStr[1], content: parsedStr[2] };
  });
  if (messages && messages.length > 0) socket.emit("messages", messages);
};
module.exports.addFriend = async (socket, friendName, cb) => {
  if (friendName === socket.user.username) {
    return cb({ done: false, errorMgs: "Cannot add self" });
  }
  const friend = await redisClient.hgetall(`userid:${friendName}`);
  const currentFriendList = await redisClient.lrange(
    `friends:${socket.user.username}`,
    0,
    -1
  );
  if (!friend) {
    cb({ done: false, errorMgs: "User doesn't exist" });
    return;
  } else if (currentFriendList && currentFriendList.includes(friendName)) {
    cb({ done: false, errorMgs: "Friend already exist" });
  } else {
    await redisClient.lpush(
      `friends:${socket.user.username}`,
      [friendName, friend.userid].join(".")
    );
    const newFnd = {
      username: friendName,
      userid: friend.userid,
      connected: friend.connected,
    };
    cb({ done: true, newFnd });
  }
};

module.exports.onDisconnect = async (socket) => {
  await redisClient.hset(`userid:${socket.user.username}`, "connected", false);
  const friendList = await redisClient.lrange(
    `friends:${socket.user.username}`,
    0,
    -1
  );
  const friendRooms = await parseFriendList(friendList).then((friends) =>
    friends.map((friend) => friend.userid)
  );
  socket.to(friendRooms).emit("connected", false, socket.user.username);
};

const parseFriendList = async (friendList) => {
  const newFriendList = [];
  for (let friend of friendList) {
    const parsedFriend = friend.split(".");
    const friendConnected = await redisClient.hget(
      `userid:${parsedFriend[0]}`,
      "connected"
    );
    newFriendList.push({
      username: parsedFriend[0],
      userid: parsedFriend[1],
      connected: friendConnected,
    });
  }
  return newFriendList;
};
