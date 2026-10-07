import mongoose from "mongoose";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { assertPublicHttpsUrl } from "../lib/safeFetch.js";
import { incomingUrl, newHookToken, postAsBot, randomPasswordHash } from "../lib/bots.js";

const MAX_BOTS_PER_USER = 5;

const present = (req, bot) => ({
  _id: bot._id,
  fullName: bot.fullName,
  profilePic: bot.profilePic,
  isBot: true,
  webhookUrl: bot.webhookUrl || "",
  incomingUrl: incomingUrl(req, bot.hookToken),
  createdAt: bot.createdAt,
});

const cleanName = (v) => (typeof v === "string" ? v.trim().slice(0, 50) : "");

// empty string clears the outgoing webhook; anything else must be a public https url
const parseWebhook = async (value) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Invalid webhook URL");
  if (!value.trim()) return "";
  await assertPublicHttpsUrl(value.trim());
  return value.trim();
};

export const listBots = async (req, res) => {
  try {
    const bots = await User.find({ ownerId: req.user._id, isBot: true }).select("+webhookUrl +hookToken");
    res.status(200).json(bots.map((b) => present(req, b)));
  } catch (error) {
    console.error("listBots:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createBot = async (req, res) => {
  try {
    const fullName = cleanName(req.body.name);
    if (!fullName) return res.status(400).json({ message: "Bot name is required" });

    if ((await User.countDocuments({ ownerId: req.user._id, isBot: true })) >= MAX_BOTS_PER_USER) {
      return res.status(400).json({ message: `You can create up to ${MAX_BOTS_PER_USER} bots` });
    }
    let webhookUrl;
    try {
      webhookUrl = await parseWebhook(req.body.webhookUrl);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const id = new mongoose.Types.ObjectId();
    const bot = await User.create({
      _id: id,
      fullName,
      email: `bot-${id}@bots.invalid`,
      password: await randomPasswordHash(),
      isBot: true,
      ownerId: req.user._id,
      webhookUrl: webhookUrl || undefined,
      hookToken: newHookToken(),
    });
    const full = await User.findById(bot._id).select("+webhookUrl +hookToken");
    await postAsBot(
      bot._id,
      req.user._id,
      `Hi! I'm ${fullName}. Send me a message and I'll forward it to your webhook, or POST to my incoming URL to make me talk to you.`,
    );
    res.status(201).json(present(req, full));
  } catch (error) {
    console.error("createBot:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBot = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.botId)) {
      return res.status(400).json({ message: "Invalid bot id" });
    }
    const bot = await User.findOne({
      _id: req.params.botId,
      ownerId: req.user._id,
      isBot: true,
    }).select("+webhookUrl +hookToken");
    if (!bot) return res.status(404).json({ message: "Bot not found" });

    if (req.body.name !== undefined) {
      const name = cleanName(req.body.name);
      if (!name) return res.status(400).json({ message: "Bot name is required" });
      bot.fullName = name;
    }
    try {
      const url = await parseWebhook(req.body.webhookUrl);
      if (url !== undefined) bot.webhookUrl = url || undefined;
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    if (req.body.rotateToken === true) bot.hookToken = newHookToken();
    await bot.save();
    res.status(200).json(present(req, bot));
  } catch (error) {
    console.error("updateBot:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteBot = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.botId)) {
      return res.status(400).json({ message: "Invalid bot id" });
    }
    const bot = await User.findOneAndDelete({
      _id: req.params.botId,
      ownerId: req.user._id,
      isBot: true,
    });
    if (!bot) return res.status(404).json({ message: "Bot not found" });
    await Message.deleteMany({ $or: [{ senderId: bot._id }, { receiverId: bot._id }] });
    res.status(200).json({ message: "Bot deleted" });
  } catch (error) {
    console.error("deleteBot:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PUBLIC: POST /api/hooks/:token  { text }  -> the bot messages its owner
export const incomingWebhook = async (req, res) => {
  try {
    const { token } = req.params;
    const text = req.body?.text;
    if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) {
      return res.status(404).json({ message: "Not found" });
    }
    if (typeof text !== "string" || !text.trim() || text.length > 2000) {
      return res.status(400).json({ message: "Body must be JSON like {\"text\":\"...\"} (max 2000 chars)" });
    }
    const bot = await User.findOne({ hookToken: token, isBot: true }).select("_id ownerId");
    if (!bot?.ownerId) return res.status(404).json({ message: "Not found" });

    await postAsBot(bot._id, bot.ownerId, text.trim());
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("incomingWebhook:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
