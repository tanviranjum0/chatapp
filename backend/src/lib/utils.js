import jwt from "jsonwebtoken";
import { ENV, IS_PROD } from "./env.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// the web app proxies /api to this server (see frontend/vercel.json), so the browser sees the cookie
// as first-party. That is what makes login work on iOS/Safari, which blocks cross-site cookies.
// HttpOnly so JS (XSS) can never read it.
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
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

// short lived token that lets the browser open the realtime socket straight to this server
// without needing a (cross-site) cookie. It can never be used as a login cookie.
export const generateSocketToken = (userId) =>
  jwt.sign({ userId, purpose: "socket" }, ENV.JWT_SECRET, { expiresIn: "2m", algorithm: "HS256" });
