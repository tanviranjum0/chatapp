import jwt from "jsonwebtoken";
import { parseCookie } from "cookie";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // browsers on a different site than this server (iOS/Safari blocks cross-site cookies) send a
    // short lived socket token; same-site clients and old tabs still authenticate with the cookie
    const handshakeToken = socket.handshake.auth?.token;
    const token =
      typeof handshakeToken === "string" ? handshakeToken : parseCookie(socket.handshake.headers.cookie || "").jwt;

    if (!token) return next(new Error("Unauthorized - No Token Provided"));

    // verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return next(new Error("Unauthorized - Invalid Token"));
    }

    // a socket token is only valid in the handshake, the login cookie never carries a purpose
    if (typeof handshakeToken === "string" ? decoded.purpose !== "socket" : decoded.purpose) {
      return next(new Error("Unauthorized - Invalid Token"));
    }

    // find the user from db
    const user = await User.findById(decoded.userId).select("-password").lean();
    if (!user) return next(new Error("User not found"));

    // attach user info to socket
    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (error) {
    console.error("Error in socket authentication:", error.message);
    next(new Error("Unauthorized - Authentication failed"));
  }
};
