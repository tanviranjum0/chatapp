import crypto from "node:crypto";
import OtpChallenge from "../models/OtpChallenge.js";
import { ENV } from "./env.js";
import { AppError } from "./errors.js";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;

const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const hashCode = (purpose, email, code) =>
  crypto.createHmac("sha256", ENV.JWT_SECRET).update(`${purpose}:${email}:${code}`).digest("hex");

const normalize = (email) => String(email || "").trim().toLowerCase();

// creates (or refreshes) the challenge and returns the plain code to e-mail
export const issueChallenge = async ({ purpose, email, payload }) => {
  email = normalize(email);
  const existing = await OtpChallenge.findOne({ purpose, email });

  if (existing) {
    const wait = RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime());
    if (wait > 0) {
      throw new AppError(429, `Please wait ${Math.ceil(wait / 1000)}s before asking for another code.`, "OTP_COOLDOWN");
    }
    if (existing.sendCount >= MAX_SENDS) {
      throw new AppError(429, "Too many codes requested. Please try again in a few minutes.", "OTP_LIMIT");
    }
  }

  const code = newCode();
  const now = Date.now();
  await OtpChallenge.findOneAndUpdate(
    { purpose, email },
    {
      codeHash: hashCode(purpose, email, code),
      attempts: 0,
      sendCount: (existing?.sendCount || 0) + 1,
      lastSentAt: new Date(now),
      expiresAt: new Date(now + CODE_TTL_MS),
      // a resend keeps the original payload (e.g. the pending signup)
      payload: payload ?? existing?.toObject().payload,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return code;
};

export const dropChallenge = (purpose, email) => OtpChallenge.deleteOne({ purpose, email: normalize(email) });

export const getChallenge = (purpose, email) => OtpChallenge.findOne({ purpose, email: normalize(email) });

// verifies a code; consumes the challenge on success and returns it (with its payload)
export const consumeChallenge = async ({ purpose, email, code }) => {
  email = normalize(email);
  const cleaned = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) throw new AppError(400, "Enter the 6-digit code from your email.", "OTP_FORMAT");

  const ch = await OtpChallenge.findOne({ purpose, email });
  if (!ch || ch.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "That code has expired. Request a new one.", "OTP_EXPIRED");
  }
  if (ch.attempts >= MAX_ATTEMPTS) {
    await ch.deleteOne();
    throw new AppError(429, "Too many wrong codes. Request a new one.", "OTP_LOCKED");
  }

  const expected = Buffer.from(ch.codeHash, "hex");
  const given = Buffer.from(hashCode(purpose, email, cleaned), "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    ch.attempts += 1;
    await ch.save();
    const left = MAX_ATTEMPTS - ch.attempts;
    throw new AppError(
      400,
      left > 0 ? `Incorrect code. ${left} ${left === 1 ? "attempt" : "attempts"} left.` : "Incorrect code. Request a new one.",
      "OTP_INVALID",
    );
  }

  await ch.deleteOne();
  return ch;
};
