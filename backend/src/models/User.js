import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never leaks through a query unless explicitly requested
    },
    profilePic: {
      type: String,
      default: "",
    },

    // ---- bots & integrations ----
    isBot: { type: Boolean, default: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who created the bot
    builtin: { type: String }, // e.g. "assistant" for the shared AI bot
    webhookUrl: { type: String, maxlength: 500, select: false }, // outgoing: we POST user messages here
    hookToken: { type: String, select: false, index: true, sparse: true }, // incoming webhook secret
  },
  { timestamps: true } // createdAt & updatedAt
);

const User = mongoose.model("User", userSchema);

export default User;
