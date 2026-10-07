import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true, maxlength: 16 },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    file: {
      url: String,
      name: String,
      size: Number,
      mimeType: String,
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    forwarded: { type: Boolean, default: false },
    reactions: { type: [reactionSchema], default: [] },
    readAt: Date, // when the receiver opened the conversation
    editedAt: Date,
    deletedAt: Date,
  },
  { timestamps: true }
);

// conversation lookups (both directions) and chat-partner discovery
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
// unread counters
messageSchema.index({ receiverId: 1, readAt: 1, senderId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
