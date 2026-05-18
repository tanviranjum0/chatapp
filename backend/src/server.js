import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";
import mongoSanitize from "@exortek/express-mongo-sanitize";

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;
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
    onSanitize: ({ key, originalValue, sanitizedValue }) => {
      console.log(`Sanitized ${key}`);
    },
  }),
);
app.use(express.json({ limit: "5mb" })); // req.body
app.use(
  cors({
    origin: [ENV.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
  }),
);
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("Server running on port: " + PORT);
  connectDB();
});
