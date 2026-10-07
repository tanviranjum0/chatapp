import mongoose from "mongoose";
import CallLog from "../models/CallLog.js";
import User from "../models/User.js";
import { AppError, sendError } from "../lib/errors.js";
import { presentLog, usersById } from "../lib/callLogs.js";

const PAGE = 40;

// GET /calls/history?limit=&before=   (newest first, only my own calls, not the ones I deleted)
export const getHistory = async (req, res) => {
  try {
    const me = req.user._id;
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || PAGE));
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    if (before && Number.isNaN(before.getTime())) throw new AppError(400, "Invalid date.", "BAD_DATE");

    const filter = { $or: [{ callerId: me }, { calleeId: me }], hiddenFor: { $ne: me } };
    if (before) filter.startedAt = { $lt: before };

    const rows = await CallLog.find(filter)
      .sort({ startedAt: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const users = await usersById(page.flatMap((r) => [r.callerId, r.calleeId]));

    // calls I did not get to answer since I last looked at the list
    const seenAt = (await User.findById(me).select("callsSeenAt").lean())?.callsSeenAt || new Date(0);
    const missedUnseen = await CallLog.countDocuments({
      calleeId: me,
      hiddenFor: { $ne: me },
      status: { $in: ["missed", "cancelled", "busy"] },
      startedAt: { $gt: seenAt },
    });

    res.status(200).json({ logs: page.map((r) => presentLog(r, me, users)), hasMore, missedUnseen });
  } catch (error) {
    sendError(res, error, "getHistory");
  }
};

export const markSeen = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { callsSeenAt: new Date() });
    res.status(200).json({ missedUnseen: 0 });
  } catch (error) {
    sendError(res, error, "markSeen");
  }
};

// "delete" hides the entry for me only: the other person keeps theirs
export const deleteOne = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, "Invalid id.", "BAD_ID");
    const me = req.user._id;
    const r = await CallLog.updateOne(
      { _id: req.params.id, $or: [{ callerId: me }, { calleeId: me }] },
      { $addToSet: { hiddenFor: me } },
    );
    if (!r.matchedCount) throw new AppError(404, "That call is not in your history.", "NOT_FOUND");
    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, error, "deleteCallLog");
  }
};

export const clearAll = async (req, res) => {
  try {
    const me = req.user._id;
    const r = await CallLog.updateMany({ $or: [{ callerId: me }, { calleeId: me }] }, { $addToSet: { hiddenFor: me } });
    res.status(200).json({ cleared: r.modifiedCount });
  } catch (error) {
    sendError(res, error, "clearCallLogs");
  }
};
