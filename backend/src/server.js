import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { aiRouter, botRouter, callRouter, clientErrorRouter, hookRouter } from "./routes/extras.route.js";
import { ensureAssistantBot } from "./lib/bots.js";
import { connectDB } from "./lib/db.js";
import { ENV, IS_PROD, ALLOWED_ORIGINS, assertEnv } from "./lib/env.js";
import { app, server, io } from "./lib/socket.js";
import mongoSanitize from "@exortek/express-mongo-sanitize";
import { errorMiddleware, notFoundMiddleware } from "./lib/errors.js";

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

assertEnv();

const __dirname = path.resolve();
const PORT = ENV.PORT || 3000;

// Render (and most hosts) terminate TLS in a proxy: needed for correct client IPs / secure cookies
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

app.use(
  cors({
    origin: (origin, cb) => {
      // no Origin header = same-origin / server-to-server / health checks
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// cheap liveness probe for Render, registered before the heavy middleware
app.get("/health", (_, res) =>
  res.status(200).json({ status: "ok", db: mongoose.connection.readyState === 1 }),
);

app.get("/api/health", (_, res) => res.status(200).json({ status: "ok" }));

app.use(express.json({ limit: "8mb" })); // req.body (images and files travel as base64)
app.use(
  mongoSanitize({
    replaceWith: "", // Replace matched chars with this string
    removeMatches: false, // Remove entire key-value pair if pattern matches
    sanitizeObjects: ["body", "query"], // Request fields to sanitize
    contentTypes: ["application/json", "application/x-www-form-urlencoded"],
    mode: "auto", // 'auto' | 'manual'
    skipRoutes: [], // Routes to skip (string or RegExp)
    recursive: true, // Sanitize nested objects
    maxDepth: null, // Max recursion depth (null = unlimited)
    onSanitize: ({ key }) => {
      console.warn(`Sanitized ${key}`);
    },
  }),
);
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRouter);
app.use("/api/bots", botRouter);
app.use("/api/calls", callRouter);
app.use("/api/hooks", hookRouter);
app.use("/api/client-errors", clientErrorRouter);

// the frontend is hosted on Vercel; only serve the bundle if it was built next to the API
const distPath = path.join(__dirname, "../frontend/dist");
if (IS_PROD && fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get("*", (_, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// unknown API routes answer with json (not an html page), then the shared error mapper
app.use("/api", notFoundMiddleware);
app.use(errorMiddleware);

// a crash in one request/handler must never take the whole chat server down
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

// connect to the database first so we never accept traffic we cannot serve
await connectDB();

server.listen(PORT, () => {
  console.log("Server running on port: " + PORT);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  io.close();
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
