import bcrypt from "bcryptjs";
import { sendVerificationEmail, sendWelcomeEmail } from "../emails/emailHandlers.js";
import { cookieOptions, generateSocketToken, generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";
import { isValidImageDataUri, uploadImage } from "../lib/image.js";
import { AppError, sendError } from "../lib/errors.js";
import {
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  consumeChallenge,
  dropChallenge,
  getChallenge,
  issueChallenge,
} from "../lib/otp.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  twoFactorEnabled: Boolean(user.twoFactorEnabled),
});

const str = (v) => (typeof v === "string" ? v : "");

const normalizeEmail = (value) => {
  const email = str(value).trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new AppError(400, "Enter a valid email address.", "BAD_EMAIL");
  }
  return email;
};

// what the client needs to render the "enter your code" step
const challengeInfo = (purpose, email) => ({
  needsVerification: true,
  purpose,
  email,
  resendIn: RESEND_COOLDOWN_MS / 1000,
  expiresIn: CODE_TTL_MS / 1000,
});

// issues a challenge and mails the code; if the mail cannot be sent the challenge is withdrawn
const sendChallenge = async ({ purpose, email, name, payload }) => {
  const code = await issueChallenge({ purpose, email, payload });
  try {
    await sendVerificationEmail(email, name, code, purpose);
  } catch (error) {
    await dropChallenge(purpose, email);
    throw error;
  }
};

export const signup = async (req, res) => {
  try {
    const fullName = str(req.body?.fullName).trim();
    const password = str(req.body?.password);

    // typeof checks also stop operator-injection payloads such as {"$gt": ""}
    if (!fullName || !str(req.body?.email).trim() || !password) {
      throw new AppError(400, "Name, email and password are all required.", "MISSING_FIELDS");
    }
    if (fullName.length > 50) throw new AppError(400, "Name must be at most 50 characters.", "NAME_LONG");
    if (password.length < 6) throw new AppError(400, "Password must be at least 6 characters.", "PASSWORD_SHORT");
    // bcrypt silently truncates after 72 bytes
    if (password.length > 72) throw new AppError(400, "Password must be at most 72 characters.", "PASSWORD_LONG");
    const email = normalizeEmail(req.body.email);

    if (await User.exists({ email })) {
      throw new AppError(409, "An account with this email already exists. Try logging in.", "EMAIL_TAKEN");
    }

    // the account is created only after the emailed code is confirmed
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await sendChallenge({
      purpose: "signup",
      email,
      name: fullName,
      payload: { fullName, passwordHash },
    });
    res.status(202).json(challengeInfo("signup", email));
  } catch (error) {
    sendError(res, error, "signup");
  }
};

export const verifySignup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const ch = await consumeChallenge({ purpose: "signup", email, code: req.body?.code });
    if (!ch.payload?.passwordHash) throw new AppError(400, "Start the sign up again.", "OTP_EXPIRED");

    let user;
    try {
      user = await User.create({ fullName: ch.payload.fullName, email, password: ch.payload.passwordHash });
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(409, "An account with this email already exists. Try logging in.", "EMAIL_TAKEN");
      }
      throw error;
    }
    generateToken(user._id, res);
    res.status(201).json(publicUser(user));

    // fire and forget: the response is already sent, so do not block on the mail provider
    sendWelcomeEmail(user.email, user.fullName, ENV.CLIENT_URL?.split(",")[0]).catch((e) =>
      console.error("Failed to send welcome email:", e.message),
    );
  } catch (error) {
    sendError(res, error, "verifySignup");
  }
};

export const login = async (req, res) => {
  try {
    const emailRaw = str(req.body?.email).trim().toLowerCase();
    const password = str(req.body?.password);
    if (!emailRaw || !password) throw new AppError(400, "Email and password are required.", "MISSING_FIELDS");

    const user = await User.findOne({ email: emailRaw }).select("+password");
    // never tell the client which one is incorrect: password or email
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) throw new AppError(400, "Wrong email or password.", "BAD_CREDENTIALS");
    if (user.isBot) throw new AppError(400, "Wrong email or password.", "BAD_CREDENTIALS");

    if (user.twoFactorEnabled) {
      await sendChallenge({
        purpose: "login",
        email: user.email,
        name: user.fullName,
        payload: { userId: user._id },
      });
      return res.status(202).json(challengeInfo("login", user.email));
    }

    generateToken(user._id, res);
    res.status(200).json(publicUser(user));
  } catch (error) {
    sendError(res, error, "login");
  }
};

export const verifyLogin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const ch = await consumeChallenge({ purpose: "login", email, code: req.body?.code });
    const user = await User.findById(ch.payload?.userId);
    if (!user) throw new AppError(400, "Start the login again.", "OTP_EXPIRED");

    generateToken(user._id, res);
    res.status(200).json(publicUser(user));
  } catch (error) {
    sendError(res, error, "verifyLogin");
  }
};

// resend works only for a challenge that already exists (so it can not be used to spam strangers)
export const resendCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const purpose = str(req.body?.purpose);
    if (!["signup", "login", "enable2fa"].includes(purpose)) {
      throw new AppError(400, "Unknown request.", "BAD_PURPOSE");
    }
    const existing = await getChallenge(purpose, email);
    if (!existing) throw new AppError(400, "That request expired. Please start again.", "OTP_EXPIRED");
    if (purpose === "enable2fa" && String(existing.payload?.userId) !== String(req.user?._id)) {
      throw new AppError(403, "Not allowed.", "FORBIDDEN");
    }

    const name = existing.payload?.fullName || "there";
    await sendChallenge({ purpose, email, name });
    res.status(200).json(challengeInfo(purpose, email));
  } catch (error) {
    sendError(res, error, "resendCode");
  }
};

export const logout = (_, res) => {
  // the attributes must match the ones used when the cookie was set, or browsers keep it
  res.clearCookie("jwt", cookieOptions);
  res.status(200).json({ message: "Logged out successfully" });
};

// ---- two-factor authentication management (logged in) ----
export const startEnableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is already on.", "ALREADY_ON");
    if (!(await bcrypt.compare(str(req.body?.password), user.password))) {
      throw new AppError(400, "That password is not correct.", "BAD_CREDENTIALS");
    }
    await sendChallenge({
      purpose: "enable2fa",
      email: user.email,
      name: user.fullName,
      payload: { userId: user._id, fullName: user.fullName },
    });
    res.status(202).json(challengeInfo("enable2fa", user.email));
  } catch (error) {
    sendError(res, error, "startEnableTwoFactor");
  }
};

export const confirmEnableTwoFactor = async (req, res) => {
  try {
    const ch = await consumeChallenge({ purpose: "enable2fa", email: req.user.email, code: req.body?.code });
    if (String(ch.payload?.userId) !== String(req.user._id)) throw new AppError(403, "Not allowed.", "FORBIDDEN");
    const user = await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true }, { new: true });
    res.status(200).json(publicUser(user));
  } catch (error) {
    sendError(res, error, "confirmEnableTwoFactor");
  }
};

export const disableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!(await bcrypt.compare(str(req.body?.password), user.password))) {
      throw new AppError(400, "That password is not correct.", "BAD_CREDENTIALS");
    }
    user.twoFactorEnabled = false;
    await user.save();
    res.status(200).json(publicUser(user));
  } catch (error) {
    sendError(res, error, "disableTwoFactor");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) throw new AppError(400, "Choose a picture first.", "MISSING_FIELDS");
    if (!isValidImageDataUri(profilePic)) {
      throw new AppError(400, "That picture isn't supported or is too large (max ~3MB).", "BAD_IMAGE");
    }

    const url = await uploadImage(profilePic, {
      folder: "chatapp/avatars",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "auto" }],
    });

    const updatedUser = await User.findByIdAndUpdate(req.user._id, { profilePic: url }, { new: true }).select(
      "-password",
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    sendError(res, error, "updateProfile");
  }
};

export const socketToken = (req, res) => {
  res.status(200).json({ token: generateSocketToken(req.user._id) });
};
