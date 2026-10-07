import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ALLOWED_ORIGINS } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
  maxHttpBufferSize: 1e5, // clients never push payloads over this socket
  pingTimeout: 30000,
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// {userId: Set<socketId>} - a user can be connected from several tabs/devices
const userSocketMap = new Map();

// returns the room name every socket of a user joins
export const userRoom = (userId) => `user:${userId}`;

export function isUserOnline(userId) {
  return userSocketMap.has(userId.toString());
}

const broadcastOnlineUsers = () => io.emit("getOnlineUsers", [...userSocketMap.keys()]);

io.on("connection", (socket) => {
  const userId = socket.userId;

  socket.join(userRoom(userId));

  const sockets = userSocketMap.get(userId) ?? new Set();
  sockets.add(socket.id);
  userSocketMap.set(userId, sockets);

  // io.emit() is used to send events to all connected clients
  broadcastOnlineUsers();

  socket.on("disconnect", () => {
    const set = userSocketMap.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) userSocketMap.delete(userId);
    }
    broadcastOnlineUsers();
  });
});

export { io, app, server };
