import express from "express";
import rateLimit from "express-rate-limit";
import {
  signup,
  verifySignup,
  login,
  verifyLogin,
  resendCode,
  logout,
  updateProfile,
  socketToken,
  startEnableTwoFactor,
  confirmEnableTwoFactor,
  disableTwoFactor,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

const TOO_MANY = { message: "Too many attempts. Please try again in a few minutes.", code: "RATE_LIMIT" };

// brute-force guards on top of arcjet. The web app reaches this API through proxies (Vercel, Render's
// edge), so many visitors can share one IP: the per-IP cap is generous and the strict cap is per account.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: TOO_MANY,
});

const byEmail = (req) => `acct:${String(req.body?.email ?? "").trim().toLowerCase().slice(0, 254)}`;

// 10 attempts / 15 min for one email address, whatever IP they come from
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: TOO_MANY,
  keyGenerator: byEmail,
  validate: { keyGeneratorIpFallback: false },
});

// code entry / resend: the code itself also locks after 5 wrong tries
const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: TOO_MANY,
  keyGenerator: byEmail,
  validate: { keyGeneratorIpFallback: false },
});

router.use(arcjetProtection);

router.post("/signup", credentialLimiter, accountLimiter, signup);
router.post("/verify-signup", credentialLimiter, codeLimiter, verifySignup);
router.post("/login", credentialLimiter, accountLimiter, login);
router.post("/verify-login", credentialLimiter, codeLimiter, verifyLogin);
router.post("/resend-code", credentialLimiter, codeLimiter, (req, res, next) => {
  // enable2fa resends need a logged in user, the other two are part of an unfinished login/signup
  if (req.body?.purpose === "enable2fa") return protectRoute(req, res, () => resendCode(req, res, next));
  return resendCode(req, res, next);
});
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.post("/two-factor/start", protectRoute, credentialLimiter, startEnableTwoFactor);
router.post("/two-factor/confirm", protectRoute, credentialLimiter, confirmEnableTwoFactor);
router.post("/two-factor/disable", protectRoute, credentialLimiter, disableTwoFactor);

router.get("/socket-token", protectRoute, socketToken);

router.get("/check", protectRoute, (req, res) => res.status(200).json(req.user));

export default router;
