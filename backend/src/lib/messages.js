import Message from "../models/Message.js";
import { io, userRoom } from "./socket.js";

const PREVIEW_CHARS = 140;

// the trimmed copy of a replied-to message that travels with the reply
const previewOf = (m) => ({
  _id: m._id,
  senderId: m.senderId,
  text: m.deletedAt ? "" : (m.text || "").slice(0, PREVIEW_CHARS),
  hasImage: !m.deletedAt && Boolean(m.image),
  fileName: !m.deletedAt ? m.file?.name : undefined,
  deleted: Boolean(m.deletedAt),
});

// plain objects with `replyPreview` filled in (one query for the whole page)
export const withReplyPreviews = async (messages) => {
  const plain = messages.map((m) => (typeof m.toObject === "function" ? m.toObject() : m));
  const ids = [...new Set(plain.filter((m) => m.replyTo).map((m) => String(m.replyTo)))];
  if (!ids.length) return plain;

  const originals = await Message.find({ _id: { $in: ids } })
    .select("senderId text image file deletedAt")
    .lean();
  const byId = new Map(originals.map((o) => [String(o._id), previewOf(o)]));
  return plain.map((m) => (m.replyTo ? { ...m, replyPreview: byId.get(String(m.replyTo)) } : m));
};

export const withReplyPreview = async (message) => (await withReplyPreviews([message]))[0];

// every tab/device of both participants joins their user room
export const emitToParticipants = (event, message) => {
  io.to(userRoom(message.senderId)).to(userRoom(message.receiverId)).emit(event, message);
};

// remove everything a deleted message used to carry
export const tombstoneUpdate = () => ({
  $set: { deletedAt: new Date(), reactions: [] },
  $unset: { text: 1, image: 1, file: 1, replyTo: 1 },
});
