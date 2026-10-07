import mongoose from "mongoose";
import {
  isValidImageDataUri,
  uploadImage,
  checkFileDataUri,
  uploadFile,
  safeFileName,
} from "../lib/image.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import {
  emitToParticipants,
  tombstoneUpdate,
  withReplyPreview,
  withReplyPreviews,
} from "../lib/messages.js";
import { handleMessageToBot } from "../lib/bots.js";

const MESSAGE_PAGE_SIZE = 300;
const MAX_TEXT = 2000;
const MAX_EMOJI_LEN = 16;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

// who may see which bot: everyone sees the built-in ones, owners see their own
const visibleUsersFilter = (me) => ({
  _id: { $ne: me },
  $or: [{ isBot: { $ne: true } }, { builtin: { $exists: true } }, { ownerId: me }],
});

export const getAllContacts = async (req, res) => {
  try {
    const users = await User.find(visibleUsersFilter(req.user._id))
      .select("-password")
      .sort({ fullName: 1 })
      .lean();

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllContacts:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const conversationFilter = (a, b) => ({
  $or: [
    { senderId: a, receiverId: b },
    { senderId: b, receiverId: a },
  ],
});

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: otherId } = req.params;
    const { around } = req.query;

    if (!isId(otherId)) return res.status(400).json({ message: "Invalid user id" });

    let messages;
    if (typeof around === "string" && isId(around)) {
      // jump to an old message (search results): a window on both sides of it
      const target = await Message.findOne({
        _id: around,
        ...conversationFilter(myId, otherId),
      }).lean();
      if (!target) return res.status(404).json({ message: "Message not found" });
      const [before, after] = await Promise.all([
        Message.find({ ...conversationFilter(myId, otherId), createdAt: { $lte: target.createdAt } })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Message.find({ ...conversationFilter(myId, otherId), createdAt: { $gt: target.createdAt } })
          .sort({ createdAt: 1 })
          .limit(100)
          .lean(),
      ]);
      messages = [...before.reverse(), ...after];
    } else {
      // newest page first (uses the compound indexes), then flip back to chronological order
      messages = (
        await Message.find(conversationFilter(myId, otherId))
          .sort({ createdAt: -1 })
          .limit(MESSAGE_PAGE_SIZE)
          .lean()
      ).reverse();
    }

    res.status(200).json(await withReplyPreviews(messages));
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// stores + broadcasts one message; shared by send and forward
const deliver = async ({ sender, receiverId, text, imageUrl, file, replyTo, forwarded }) => {
  const msg = await Message.create({
    senderId: sender._id,
    receiverId,
    text,
    image: imageUrl,
    file,
    replyTo,
    forwarded: forwarded || undefined,
  });
  const out = await withReplyPreview(msg);
  emitToParticipants("newMessage", out);
  return out;
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const sender = req.user;

    if (!isId(receiverId)) return res.status(400).json({ message: "Invalid user id" });
    if (text !== undefined && typeof text !== "string") {
      return res.status(400).json({ message: "Invalid message text." });
    }
    if (!text?.trim() && !image && !file) {
      return res.status(400).json({ message: "Text, image or file is required." });
    }
    if (text && text.length > MAX_TEXT) {
      return res.status(400).json({ message: "Message is too long (max 2000 characters)." });
    }
    if (image && !isValidImageDataUri(image)) {
      return res.status(400).json({ message: "Invalid or too large image." });
    }
    let fileCheck;
    if (file) {
      fileCheck = checkFileDataUri(file.data);
      if (!fileCheck.ok || typeof file.name !== "string") {
        return res.status(400).json({ message: "Unsupported or too large file (max 4MB)." });
      }
    }
    if (sender._id.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiver = await User.findById(receiverId).select("isBot ownerId builtin");
    if (!receiver) return res.status(404).json({ message: "Receiver not found." });
    if (receiver.isBot && !receiver.builtin && !receiver.ownerId?.equals(sender._id)) {
      return res.status(403).json({ message: "This bot belongs to someone else." });
    }

    let replyId;
    if (replyTo) {
      if (!isId(replyTo)) return res.status(400).json({ message: "Invalid reply target." });
      const original = await Message.exists({
        _id: replyTo,
        ...conversationFilter(sender._id, receiverId),
      });
      if (!original) return res.status(400).json({ message: "Reply target not found." });
      replyId = replyTo;
    }

    const imageUrl = image
      ? await uploadImage(image, {
          folder: "chatapp/messages",
          transformation: [{ width: 1600, height: 1600, crop: "limit" }],
        })
      : undefined;

    let fileMeta;
    if (file) {
      const up = await uploadFile(file.data, file.name);
      fileMeta = {
        url: up.url,
        name: safeFileName(file.name),
        size: up.bytes,
        mimeType: fileCheck.mimeType,
      };
    }

    const out = await deliver({
      sender,
      receiverId,
      text,
      imageUrl,
      file: fileMeta,
      replyTo: replyId,
    });

    res.status(201).json(out);

    if (receiver.isBot) {
      handleMessageToBot(out, sender).catch((e) => console.error("bot:", e.message));
    }
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const findParticipantMessage = async (messageId, userId) => {
  if (!isId(messageId)) return null;
  return Message.findOne({
    _id: messageId,
    $or: [{ senderId: userId }, { receiverId: userId }],
  });
};

export const editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Message text is required." });
    }
    if (text.length > MAX_TEXT) {
      return res.status(400).json({ message: "Message is too long (max 2000 characters)." });
    }

    const msg = await findParticipantMessage(req.params.messageId, req.user._id);
    if (!msg) return res.status(404).json({ message: "Message not found." });
    if (!msg.senderId.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own messages." });
    }
    if (msg.deletedAt) return res.status(400).json({ message: "This message was deleted." });

    msg.text = text.trim();
    msg.editedAt = new Date();
    await msg.save();

    const out = await withReplyPreview(msg);
    emitToParticipants("messageUpdated", out);
    res.status(200).json(out);
  } catch (error) {
    console.error("Error in editMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const msg = await findParticipantMessage(req.params.messageId, req.user._id);
    if (!msg) return res.status(404).json({ message: "Message not found." });
    if (!msg.senderId.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own messages." });
    }
    if (!msg.deletedAt) {
      await Message.updateOne({ _id: msg._id }, tombstoneUpdate());
    }
    const out = await withReplyPreview(await Message.findById(msg._id));
    emitToParticipants("messageUpdated", out);
    res.status(200).json(out);
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// toggles the caller's reaction; one reaction per user per message (picking another swaps it)
export const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (typeof emoji !== "string" || !emoji.trim() || emoji.length > MAX_EMOJI_LEN) {
      return res.status(400).json({ message: "Invalid emoji." });
    }
    if (!/\p{Extended_Pictographic}/u.test(emoji)) {
      return res.status(400).json({ message: "Reactions must be emoji." });
    }

    const msg = await findParticipantMessage(req.params.messageId, req.user._id);
    if (!msg) return res.status(404).json({ message: "Message not found." });
    if (msg.deletedAt) return res.status(400).json({ message: "This message was deleted." });

    const mine = msg.reactions.find((r) => r.userId.equals(req.user._id));
    msg.reactions = msg.reactions.filter((r) => !r.userId.equals(req.user._id));
    if (!mine || mine.emoji !== emoji) msg.reactions.push({ userId: req.user._id, emoji });
    await msg.save();

    const out = await withReplyPreview(msg);
    emitToParticipants("messageUpdated", out);
    res.status(200).json(out);
  } catch (error) {
    console.error("Error in reactToMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { messageId, userIds } = req.body;
    if (!isId(messageId) || !Array.isArray(userIds) || !userIds.length || userIds.length > 5) {
      return res.status(400).json({ message: "Choose between 1 and 5 recipients." });
    }
    if (!userIds.every(isId)) return res.status(400).json({ message: "Invalid recipient." });

    const original = await findParticipantMessage(messageId, req.user._id);
    if (!original || original.deletedAt) {
      return res.status(404).json({ message: "Message not found." });
    }

    const recipients = await User.find({
      _id: { $in: [...new Set(userIds)], $ne: req.user._id },
      isBot: { $ne: true },
    })
      .select("_id")
      .lean();
    if (!recipients.length) return res.status(404).json({ message: "Recipients not found." });

    let count = 0;
    for (const r of recipients) {
      await deliver({
        sender: req.user,
        receiverId: r._id,
        text: original.text,
        imageUrl: original.image,
        file: original.file?.url ? original.toObject().file : undefined,
        forwarded: true,
      });
      count += 1;
    }
    res.status(201).json({ forwarded: count });
  } catch (error) {
    console.error("Error in forwardMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { id: otherId } = req.params;
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const filesOnly = req.query.type === "files";
    if (!isId(otherId)) return res.status(400).json({ message: "Invalid user id" });
    if (!q && !filesOnly) return res.status(200).json([]);

    const filter = { ...conversationFilter(req.user._id, otherId), deletedAt: { $exists: false } };
    if (filesOnly) {
      filter.$and = [{ $or: [{ "file.url": { $exists: true } }, { image: { $exists: true } }] }];
      if (q) filter.$and.push({ "file.name": { $regex: escapeRegex(q), $options: "i" } });
    } else {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      filter.$and = [{ $or: [{ text: rx }, { "file.name": rx }] }];
    }

    const results = await Message.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error in searchMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // distinct() is answered straight from the indexes - no need to load every message
    const [sentTo, receivedFrom] = await Promise.all([
      Message.distinct("receiverId", { senderId: loggedInUserId }),
      Message.distinct("senderId", { receiverId: loggedInUserId }),
    ]);

    const chatPartnerIds = [...new Set([...sentTo, ...receivedFrom].map(String))];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } })
      .select("-password")
      .lean();

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
