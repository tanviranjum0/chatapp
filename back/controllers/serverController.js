require("dotenv").config();
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redisClient = require("../redis");

const sessionMiddleware = () =>
  session({
    secret: "knwdvlbwlbvlen",
    credentials: true,
    name: "sid",
    store: new RedisStore({ client: redisClient }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENVIRONMENT === "production" ? "true" : "auto",
      httpOnly: true,
      expires: 1000 * 60 * 60 * 24 * 30,
      sameSite: process.env.NODE_ENVIRONMENT === "production" ? "none" : "lax",
    },
  });

const wrap = (expressMiddleware) => (socket, next) =>
  expressMiddleware(socket.request, {}, next);

module.exports = { sessionMiddleware, wrap };
