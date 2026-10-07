import CallLog from "../models/CallLog.js";
import User from "../models/User.js";

// socket.js hands us a function that pushes an event to every device of a user
let emitTo = () => {};
export const bindEmitter = (fn) => {
  emitTo = fn;
};

const RING_STALE_MS = 2 * 60 * 1000; // a call can not ring longer than this

const PUBLIC = "fullName profilePic";

// what each person sees as the outcome:
//   answered | missed | declined | noanswer | busy | cancelled | ringing
export const outcomeFor = (log, meId) => {
  const iCalled = String(log.callerId) === String(meId);
  let status = log.status;
  if (status === "ringing" && Date.now() - new Date(log.startedAt).getTime() > RING_STALE_MS) status = "missed";
  if (status === "ringing" || status === "answered" || status === "declined") return status;
  if (iCalled) return status === "missed" ? "noanswer" : status; // busy / cancelled stay as they are
  return "missed"; // callee: missed, cancelled by the caller, or they were busy elsewhere
};

// the row the app renders for one person
export const presentLog = (log, meId, users) => {
  const iCalled = String(log.callerId) === String(meId);
  const peerId = String(iCalled ? log.calleeId : log.callerId);
  const peer = users.get(peerId);
  return {
    _id: log._id,
    callId: log.callId,
    direction: iCalled ? "outgoing" : "incoming",
    outcome: outcomeFor(log, meId),
    media: log.media,
    startedAt: log.startedAt,
    answeredAt: log.answeredAt,
    endedAt: log.endedAt,
    durationSec: log.durationSec,
    offline: log.offline,
    peer: peer
      ? { _id: peer._id, fullName: peer.fullName, profilePic: peer.profilePic }
      : { _id: peerId, fullName: "Deleted user", profilePic: "" },
  };
};

export const usersById = async (ids) => {
  const list = await User.find({ _id: { $in: [...new Set(ids.map(String))] } })
    .select(PUBLIC)
    .lean();
  return new Map(list.map((u) => [String(u._id), u]));
};

// tell both people their call list changed
const publish = async (log) => {
  const users = await usersById([log.callerId, log.calleeId]);
  for (const id of [log.callerId, log.calleeId]) {
    if (log.hiddenFor?.some((h) => String(h) === String(id))) continue;
    emitTo(String(id), "callLog", presentLog(log, id, users));
  }
};

const settle = (log) => {
  const now = new Date();
  log.endedAt ??= now;
  if (log.status === "answered" && log.answeredAt) {
    log.durationSec = Math.max(0, Math.round((log.endedAt - log.answeredAt) / 1000));
  }
};

// ---- called by socket.js for each validated call signal (never throws) ----
export const recordSignal = async (fromId, msg, delivered) => {
  try {
    const { type, callId, to } = msg;

    if (type === "offer") {
      const log = await CallLog.create({
        callId,
        callerId: fromId,
        calleeId: to,
        media: msg.media === "video" ? "video" : "audio",
        // nobody is there to ring: it is a missed call the callee will find in their list
        ...(delivered ? {} : { status: "missed", offline: true, endedAt: new Date() }),
      });
      return publish(log);
    }

    const base = { callId };
    if (type === "answer") {
      const log = await CallLog.findOneAndUpdate(
        { ...base, calleeId: fromId, status: "ringing" },
        { status: "answered", answeredAt: new Date() },
        { new: true },
      );
      return log && publish(log);
    }

    if (type === "reject" || type === "busy") {
      const timedOut = type === "reject" && msg.payload?.reason === "timeout";
      const log = await CallLog.findOne({ ...base, calleeId: fromId, status: "ringing" });
      if (!log) return;
      log.status = type === "busy" ? "busy" : timedOut ? "missed" : "declined";
      log.endedBy = fromId;
      settle(log);
      await log.save();
      return publish(log);
    }

    if (type === "end") {
      const log = await CallLog.findOne({
        ...base,
        $or: [{ callerId: fromId }, { calleeId: fromId }],
        endedAt: { $exists: false },
      });
      if (!log) return;
      if (log.status === "ringing") log.status = "cancelled"; // somebody hung up before it was answered
      log.endedBy = fromId;
      settle(log);
      await log.save();
      return publish(log);
    }
  } catch (error) {
    console.error("call log:", error.message);
  }
};

// a person's last device went offline: finish whatever call they were in
export const closeCallsFor = async (userId) => {
  try {
    const open = await CallLog.find({
      $or: [{ callerId: userId }, { calleeId: userId }],
      endedAt: { $exists: false },
      status: { $in: ["ringing", "answered"] },
    });
    for (const log of open) {
      if (log.status === "ringing") log.status = String(log.callerId) === String(userId) ? "cancelled" : "missed";
      log.endedBy = userId;
      settle(log);
      await log.save();
      await publish(log);
    }
  } catch (error) {
    console.error("close calls:", error.message);
  }
};
