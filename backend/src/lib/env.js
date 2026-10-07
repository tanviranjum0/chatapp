import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  ARCJET_KEY: process.env.ARCJET_KEY,
  ARCJET_ENV: process.env.ARCJET_ENV,
  // optional: AI smart replies / translation / assistant bot (falls back to simple heuristics)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AI_MODEL: process.env.AI_MODEL || "claude-haiku-4-5-20251001",
  // optional: TURN relay for calls behind strict NATs (comma separated turn:/turns: urls)
  TURN_URLS: process.env.TURN_URLS,
  TURN_USERNAME: process.env.TURN_USERNAME,
  TURN_CREDENTIAL: process.env.TURN_CREDENTIAL,
};

export const IS_PROD = ENV.NODE_ENV === "production";

// CLIENT_URL may hold several comma separated origins (e.g. prod + preview domains)
export const ALLOWED_ORIGINS = [
  ...(ENV.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  ...(IS_PROD ? [] : ["http://localhost:5173"]),
];

// fail fast instead of crashing later on the first request
export const assertEnv = () => {
  const required = ["MONGO_URI", "JWT_SECRET"];
  if (IS_PROD) required.push("CLIENT_URL");
  const missing = required.filter((k) => !ENV[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (IS_PROD && ENV.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
};
