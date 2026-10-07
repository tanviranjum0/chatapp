import express from "express";
import rateLimit from "express-rate-limit";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { aiInfo, getSuggestions, translateBatch, translateMessage } from "../controllers/ai.controller.js";
import {
  createBot,
  deleteBot,
  incomingWebhook,
  listBots,
  updateBot,
} from "../controllers/bot.controller.js";
import { ENV } from "../lib/env.js";

const perUser = (limit) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user?._id),
    validate: { keyGeneratorIpFallback: false },
    message: { message: "Slow down a little." },
  });

// ---- public: incoming webhooks (called by scripts/CI, so no bot detection or cookies) ----
export const hookRouter = express.Router();
hookRouter.post(
  "/:token",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests" },
  }),
  incomingWebhook,
);

// ---- public: browsers report crashes so they show up in the server log ----
export const clientErrorRouter = express.Router();
clientErrorRouter.post(
  "/",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many reports" },
  }),
  (req, res) => {
    const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : undefined);
    const b = req.body || {};
    console.error(
      "CLIENT_ERROR " +
        JSON.stringify({
          message: clip(b.message, 300),
          name: clip(b.name, 60),
          stack: clip(b.stack, 1500),
          componentStack: clip(b.componentStack, 800),
          url: clip(b.url, 200),
          ua: clip(req.headers["user-agent"], 160),
          build: clip(b.build, 40),
        }),
    );
    res.status(204).end();
  },
);

// ---- authenticated ----
export const aiRouter = express.Router();
aiRouter.use(arcjetProtection, protectRoute);
aiRouter.get("/info", aiInfo);
aiRouter.post("/suggestions", perUser(20), getSuggestions);
aiRouter.post("/translate", perUser(60), translateMessage);
aiRouter.post("/translate-batch", perUser(30), translateBatch);

export const botRouter = express.Router();
botRouter.use(arcjetProtection, protectRoute);
botRouter.get("/", listBots);
botRouter.post("/", perUser(10), createBot);
botRouter.patch("/:botId", perUser(30), updateBot);
botRouter.delete("/:botId", perUser(30), deleteBot);

// ICE servers for WebRTC calls (TURN is optional and configured through env)
export const callRouter = express.Router();
callRouter.use(arcjetProtection, protectRoute);
callRouter.get("/ice", (_req, res) => {
  const iceServers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turn = (ENV.TURN_URLS || "").split(",").map((u) => u.trim()).filter(Boolean);
  if (turn.length && ENV.TURN_USERNAME && ENV.TURN_CREDENTIAL) {
    iceServers.push({ urls: turn, username: ENV.TURN_USERNAME, credential: ENV.TURN_CREDENTIAL });
  }
  res.status(200).json({ iceServers, relay: turn.length > 0 });
});
