import express from "express";
import rateLimit from "express-rate-limit";
import {
  deleteMessage,
  editMessage,
  forwardMessage,
  searchContacts,
  getUserById,
  markRead,
  getChatPartners,
  getMessagesByUserId,
  reactToMessage,
  searchMessages,
  sendMessage,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// searching is cheap but it is the only way to discover other users: keep it from being scraped
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id),
  validate: { keyGeneratorIpFallback: false },
  message: { message: "Searching too fast. Wait a moment.", code: "RATE_LIMIT" },
});

// the middlewares execute in order - so requests get rate-limited first, then authenticated.
// this is actually more efficient since unauthenticated requests get blocked by rate limiting before hitting the auth middleware.
router.use(arcjetProtection, protectRoute);

router.get("/contacts", searchLimiter, searchContacts);
router.get("/user/:id", getUserById);
router.post("/read/:id", markRead);
router.get("/chats", getChatPartners);
router.get("/search/:id", searchMessages);
router.post("/forward", forwardMessage);
router.post("/send/:id", sendMessage);
router.patch("/edit/:messageId", editMessage);
router.post("/react/:messageId", reactToMessage);
router.delete("/:messageId", deleteMessage);
router.get("/:id", getMessagesByUserId);

export default router;
