import jwt from "jsonwebtoken";
import { ENV, IS_PROD } from "./env.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// frontend (vercel) and backend (render) live on different sites in production,
// so the cookie must be SameSite=None; Secure. It is HttpOnly so JS (XSS) can never read it.
export const cookieOptions = {
  httpOnly: true,
  sameSite: IS_PROD ? "none" : "lax",
  secure: IS_PROD,
  path: "/",
};

export const generateToken = (userId, res) => {
  const { JWT_SECRET } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

  res.cookie("jwt", token, { ...cookieOptions, maxAge: WEEK_MS });

  return token;
};
