import mongoose from "mongoose";

// One pending e-mail verification (sign up, 2FA login, enabling 2FA). Documents delete themselves
// when they expire. Only a keyed hash of the code is stored, never the code itself.
const otpSchema = new mongoose.Schema({
  purpose: { type: String, enum: ["signup", "login", "enable2fa"], required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 1 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  payload: {
    fullName: String,
    passwordHash: String, // signup only: the account is created after the code is confirmed
    userId: mongoose.Schema.Types.ObjectId,
  },
});

otpSchema.index({ purpose: 1, email: 1 }, { unique: true });

export default mongoose.model("OtpChallenge", otpSchema);
