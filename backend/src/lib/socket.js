import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
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

  // ---- WebRTC call signalling: the server only relays, media flows peer to peer ----
  const SIGNALS = new Set(["offer", "answer", "ice", "end", "reject", "busy"]);
  let budget = 60; // signals per 10s window, ICE candidates are chatty but bounded
  const refill = setInterval(() => (budget = 60), 10_000);

  socket.on("call:signal", (msg, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    if (budget-- <= 0) return reply({ delivered: false });
    if (
      !msg ||
      typeof msg.to !== "string" ||
      !mongoose.isValidObjectId(msg.to) ||
      msg.to === userId ||
      !SIGNALS.has(msg.type) ||
      typeof msg.callId !== "string" ||
      msg.callId.length > 64 ||
      JSON.stringify(msg.payload ?? null).length > 20_000
    ) {
      return reply({ delivered: false });
    }
    const delivered = isUserOnline(msg.to);
    if (delivered) {
      io.to(userRoom(msg.to)).emit("call:signal", {
        type: msg.type,
        callId: msg.callId,
        payload: msg.payload ?? null,
        media: msg.media === "video" ? "video" : "audio",
        from: { _id: userId, fullName: socket.user.fullName, profilePic: socket.user.profilePic },
      });
    }
    reply({ delivered });
  });

  socket.on("disconnect", () => {
    clearInterval(refill);
    const set = userSocketMap.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) userSocketMap.delete(userId);
    }
    broadcastOnlineUsers();
  });
});

export { io, app, server };
