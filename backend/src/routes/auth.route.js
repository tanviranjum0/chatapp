import express from "express";
import rateLimit from "express-rate-limit";
import { signup, login, logout, updateProfile, socketToken } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// brute-force guard on top of arcjet: 15 credential attempts / 15 min / IP
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

router.use(arcjetProtection);

router.post("/signup", credentialLimiter, signup);
router.post("/login", credentialLimiter, login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/socket-token", protectRoute, socketToken);

router.get("/check", protectRoute, (req, res) => res.status(200).json(req.user));

export default router;
