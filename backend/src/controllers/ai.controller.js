import mongoose from "mongoose";
import { sendError } from "../lib/errors.js";
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
    const { text, same } = await translateText(msg.text, target);
    res.status(200).json({ messageId, target, text, same });
  } catch (error) {
    console.error("translateMessage:", error.message);
    res.status(502).json({ message: "Translation is unavailable right now" });
  }
};

export const aiInfo = (_req, res) =>
  res.status(200).json({ aiEnabled, languages: LANGUAGES });

// up to 20 messages in one request (live translation of a whole conversation)
export const translateBatch = async (req, res) => {
  try {
    const { messageIds, target } = req.body;
    if (typeof target !== "string" || !LANGUAGES[target]) {
      return res.status(400).json({ message: "Unsupported language", code: "BAD_LANG" });
    }
    if (!Array.isArray(messageIds) || !messageIds.length || messageIds.length > 20 || !messageIds.every(isId)) {
      return res.status(400).json({ message: "Send between 1 and 20 message ids.", code: "BAD_IDS" });
    }
    const msgs = await Message.find({
      _id: { $in: messageIds },
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
      deletedAt: { $exists: false },
      text: { $exists: true, $ne: "" },
    })
      .select("text")
      .lean();

    const results = {};
    const queue = [...msgs];
    // three at a time keeps us friendly to the translation provider
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (queue.length) {
          const m = queue.shift();
          try {
            const { text, same } = await translateText(m.text, target);
            results[m._id] = { text, same };
          } catch (e) {
            results[m._id] = { error: "unavailable" };
            console.error("translateBatch item:", e.message);
          }
        }
      }),
    );
    res.status(200).json({ target, results });
  } catch (error) {
    sendError(res, error, "translateBatch");
  }
};
