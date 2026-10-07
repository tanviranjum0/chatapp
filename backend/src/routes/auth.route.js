import express from "express";
import rateLimit from "express-rate-limit";
import { signup, login, logout, updateProfile, socketToken } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

const TOO_MANY = { message: "Too many attempts. Please try again in a few minutes." };

// brute-force guards on top of arcjet. The web app reaches this API through proxies (Vercel, Render's
// edge), so many visitors can share one IP: the per-IP cap is generous and the strict cap is per account.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: TOO_MANY,
});

// 10 attempts / 15 min for one email address, whatever IP they come from
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: TOO_MANY,
  keyGenerator: (req) => `acct:${String(req.body?.email ?? "").trim().toLowerCase().slice(0, 254)}`,
  validate: { keyGeneratorIpFallback: false },
});

router.use(arcjetProtection);

router.post("/signup", credentialLimiter, signup);
router.post("/login", credentialLimiter, accountLimiter, login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/socket-token", protectRoute, socketToken);

router.get("/check", protectRoute, (req, res) => res.status(200).json(req.user));

export default router;
