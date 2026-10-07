import mongoose from "mongoose";
import Message from "../models/Message.js";
import { LANGUAGES, aiEnabled, smartReplies, translateText } from "../lib/ai.js";

const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

export const getSuggestions = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!isId(userId)) return res.status(400).json({ message: "Invalid user id" });

    const me = req.user._id;
    const recent = await Message.find({
      $or: [
        { senderId: me, receiverId: userId },
        { senderId: userId, receiverId: me },
      ],
      deletedAt: { $exists: false },
      text: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const last = recent[0];
    // only suggest when the other person spoke last
    if (!last || String(last.senderId) === String(me)) {
      return res.status(200).json({ replies: [], source: "none", forMessageId: null });
    }
    const turns = recent
      .reverse()
      .map((m) => ({ mine: String(m.senderId) === String(me), text: m.text.slice(0, 300) }));

    const out = await smartReplies(turns);
    res.status(200).json({ ...out, forMessageId: last._id });
  } catch (error) {
    console.error("getSuggestions:", error.message);
    res.status(500).json({ message: "Could not generate suggestions" });
  }
};

export const translateMessage = async (req, res) => {
  try {
    const { messageId, target } = req.body;
    if (!isId(messageId)) return res.status(400).json({ message: "Invalid message id" });
    if (typeof target !== "string" || !LANGUAGES[target]) {
      return res.status(400).json({ message: "Unsupported language" });
    }
    const msg = await Message.findOne({
      _id: messageId,
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    })
      .select("text deletedAt")
      .lean();
    if (!msg || msg.deletedAt || !msg.text) {
      return res.status(404).json({ message: "Nothing to translate" });
    }
    const text = await translateText(msg.text, target);
    res.status(200).json({ messageId, target, text });
  } catch (error) {
    console.error("translateMessage:", error.message);
    res.status(502).json({ message: "Translation is unavailable right now" });
  }
};

export const aiInfo = (_req, res) =>
  res.status(200).json({ aiEnabled, languages: LANGUAGES });
