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
import { io, userRoom } from "../lib/socket.js";
import { AppError, sendError } from "../lib/errors.js";

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

// the only user fields other people may ever see (no email, no hashes)
const PUBLIC_FIELDS = "fullName profilePic isBot builtin ownerId";

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  if (!domain) return "";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(name.length - 2, 5)))}@${domain}`;
};

// GET /messages/contacts?q=  - people are found by searching, the whole user list is never shown
export const searchContacts = async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    if (q.length < 2) return res.status(200).json([]);

    const rx = escapeRegex(q);
    const me = req.user._id;
    const users = await User.find({
      ...visibleUsersFilter(me),
      $and: [
        {
          $or: [
            { fullName: { $regex: rx, $options: "i" } },
            // emails only match from the start, so the list can't be mined with fragments like "gmail"
            { isBot: { $ne: true }, email: { $regex: `^${rx}`, $options: "i" } },
          ],
        },
      ],
    })
      .select(`${PUBLIC_FIELDS} email`)
      .sort({ fullName: 1 })
      .limit(20)
      .lean();

    res.status(200).json(
      users.map(({ email, ...u }) => ({ ...u, emailHint: u.isBot ? undefined : maskEmail(email) })),
    );
  } catch (error) {
    sendError(res, error, "searchContacts");
  }
};

export const getUserById = async (req, res) => {
  try {
    if (!isId(req.params.id)) throw new AppError(400, "Invalid user id.", "BAD_ID");
    const user = await User.findOne({ _id: req.params.id, ...{ $or: [{ isBot: { $ne: true } }, { builtin: { $exists: true } }, { ownerId: req.user._id }] } })
      .select(PUBLIC_FIELDS)
      .lean();
    if (!user) throw new AppError(404, "User not found.", "NOT_FOUND");
    res.status(200).json(user);
  } catch (error) {
    sendError(res, error, "getUserById");
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
    sendError(res, error);
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
    sendError(res, error);
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
    sendError(res, error);
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
    sendError(res, error);
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
    sendError(res, error);
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
    sendError(res, error);
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
    sendError(res, error);
  }
};

const lastMessagePreview = (m) => ({
  _id: m._id,
  senderId: m.senderId,
  createdAt: m.createdAt,
  deleted: Boolean(m.deletedAt),
  text: m.deletedAt ? "" : (m.text || "").slice(0, 80),
  hasImage: !m.deletedAt && Boolean(m.image),
  fileName: !m.deletedAt ? m.file?.name : undefined,
});

// one row per conversation, newest first, with the last message and how many are unread
export const getChatPartners = async (req, res) => {
  try {
    const me = req.user._id;
    const rows = await Message.aggregate([
      { $match: { $or: [{ senderId: me }, { receiverId: me }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", me] }, "$receiverId", "$senderId"] },
          last: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", me] }, { $eq: [{ $type: "$readAt" }, "missing"] }, { $not: ["$deletedAt"] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "last.createdAt": -1 } },
      { $limit: 200 },
    ]);

    const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
      .select(PUBLIC_FIELDS)
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    res.status(200).json(
      rows
        .filter((r) => byId.has(String(r._id)))
        .map((r) => ({ ...byId.get(String(r._id)), lastMessage: lastMessagePreview(r.last), unreadCount: r.unread })),
    );
  } catch (error) {
    sendError(res, error, "getChatPartners");
  }
};

// POST /messages/read/:id  - the open conversation has been seen
export const markRead = async (req, res) => {
  try {
    if (!isId(req.params.id)) throw new AppError(400, "Invalid user id.", "BAD_ID");
    const now = new Date();
    const result = await Message.updateMany(
      { senderId: req.params.id, receiverId: req.user._id, readAt: { $exists: false } },
      { $set: { readAt: now } },
    );
    if (result.modifiedCount > 0) {
      io.to(userRoom(req.params.id)).emit("messagesRead", { by: String(req.user._id), at: now.toISOString() });
    }
    res.status(200).json({ read: result.modifiedCount });
  } catch (error) {
    sendError(res, error, "markRead");
  }
};
