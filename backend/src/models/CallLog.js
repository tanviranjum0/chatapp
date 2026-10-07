import mongoose from "mongoose";

// One row per call attempt. It is written by the server from the call signals it relays, so neither side
// can forge the outcome. `status` is from the call's point of view (see lib/callLogs.js for each person's wording).
const callLogSchema = new mongoose.Schema({
  callId: { type: String, required: true, maxlength: 64 },
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  calleeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  media: { type: String, enum: ["audio", "video"], default: "audio" },
  status: {
    type: String,
    enum: ["ringing", "answered", "missed", "declined", "cancelled", "busy"],
    default: "ringing",
  },
  offline: { type: Boolean, default: false }, // the callee had no open app when the call came in
  startedAt: { type: Date, default: Date.now },
  answeredAt: Date,
  endedAt: Date,
  durationSec: Number,
  endedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hiddenFor: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // "delete" only hides it for that person
});

callLogSchema.index({ callId: 1, callerId: 1 }, { unique: true });
callLogSchema.index({ callerId: 1, startedAt: -1 });
callLogSchema.index({ calleeId: 1, startedAt: -1 });

export default mongoose.model("CallLog", callLogSchema);
