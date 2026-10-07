import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { aiEnabled, assistantReply } from "./ai.js";
import { postJson } from "./safeFetch.js";
import { emitToParticipants, withReplyPreview } from "./messages.js";

export const newHookToken = () => crypto.randomBytes(24).toString("hex");

// a bot never logs in, so give it a password nobody knows
export const randomPasswordHash = () => bcrypt.hash(crypto.randomBytes(32).toString("hex"), 8);

// store + broadcast a message written by a bot (or an incoming webhook)
export const postAsBot = async (botId, userId, text) => {
  const msg = await Message.create({
    senderId: botId,
    receiverId: userId,
    text: String(text).slice(0, 2000),
  });
  emitToParticipants("newMessage", await withReplyPreview(msg));
  return msg;
};

// the shared AI assistant exists only when an AI key is configured
export const ensureAssistantBot = async () => {
  if (!aiEnabled) return;
  const exists = await User.exists({ builtin: "assistant" });
  if (exists) return;
  await User.create({
    fullName: "AI Assistant",
    email: "assistant@bots.invalid",
    password: await randomPasswordHash(),
    isBot: true,
    builtin: "assistant",
  });
};

const signBody = (secret, body) =>
  crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");

// called (fire and forget) after a user sends a message to a bot
export const handleMessageToBot = async (message, sender) => {
  const bot = await User.findById(message.receiverId).select("+webhookUrl +hookToken");
  if (!bot?.isBot) return;

  try {
    if (bot.builtin === "assistant") {
      const recent = await Message.find({
        $or: [
          { senderId: sender._id, receiverId: bot._id },
          { senderId: bot._id, receiverId: sender._id },
        ],
        text: { $exists: true },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      const history = recent
        .reverse()
        .map((m) => ({ mine: String(m.senderId) === String(sender._id), text: m.text }));
      const answer = await assistantReply(history);
      if (answer) await postAsBot(bot._id, sender._id, answer);
      return;
    }

    if (!bot.webhookUrl) return;
    const body = {
      event: "message",
      bot: { id: String(bot._id), name: bot.fullName },
      from: { id: String(sender._id), name: sender.fullName },
      message: { id: String(message._id), text: message.text || "", createdAt: message.createdAt },
    };
    const reply = await postJson(bot.webhookUrl, body, {
      "X-Chatapp-Signature": `sha256=${signBody(bot.hookToken, body)}`,
    });
    if (reply && typeof reply.text === "string" && reply.text.trim()) {
      await postAsBot(bot._id, sender._id, reply.text.trim());
    }
  } catch (err) {
    console.error(`Bot ${bot.fullName} failed:`, err.message);
    await postAsBot(bot._id, sender._id, "⚠️ I couldn't process that message right now.").catch(
      () => {},
    );
  }
};

export const incomingUrl = (req, token) => `${req.protocol}://${req.get("host")}/api/hooks/${token}`;
