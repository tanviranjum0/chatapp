import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { cookieOptions, generateSocketToken, generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { ENV } from "../lib/env.js";
import { isValidImageDataUri, uploadImage } from "../lib/image.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
});

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    // typeof checks also stop operator-injection payloads such as {"$gt": ""}
    if ([fullName, email, password].some((v) => typeof v !== "string" || !v.trim())) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    // bcrypt silently truncates after 72 bytes
    if (password.length > 72) {
      return res.status(400).json({ message: "Password must be at most 72 characters" });
    }
    if (fullName.trim().length > 50) {
      return res.status(400).json({ message: "Name must be at most 50 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const exists = await User.exists({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    // 123456 => $dnjasdkasj_?dmsakmk
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Persist user first, then issue auth cookie
    let savedUser;
    try {
      savedUser = await new User({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      }).save();
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: "Email already exists" });
      }
      throw error;
    }
    generateToken(savedUser._id, res);

    res.status(201).json(publicUser(savedUser));

    // fire and forget: the response is already sent, so do not block on the mail provider
    sendWelcomeEmail(savedUser.email, savedUser.fullName, ENV.CLIENT_URL?.split(",")[0]).catch(
      (error) => console.error("Failed to send welcome email:", error),
    );
  } catch (error) {
    console.error("Error in signup controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    // never tell the client which one is incorrect: password or email

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    generateToken(user._id, res);

    res.status(200).json(publicUser(user));
  } catch (error) {
    console.error("Error in login controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (_, res) => {
  // the attributes must match the ones used when the cookie was set, or browsers keep it
  res.clearCookie("jwt", cookieOptions);
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic)
      return res.status(400).json({ message: "Profile pic is required" });
    if (!isValidImageDataUri(profilePic)) {
      return res.status(400).json({ message: "Invalid or too large image" });
    }

    const userId = req.user._id;

    const url = await uploadImage(profilePic, {
      folder: "chatapp/avatars",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "auto" }],
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: url },
      { new: true },
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in update profile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const socketToken = (req, res) => {
  res.status(200).json({ token: generateSocketToken(req.user._id) });
};
