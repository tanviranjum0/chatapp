import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import {
  MessageCircleIcon,
  PhoneIcon,
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneOffIcon,
  PhoneOutgoingIcon,
  Trash2Icon,
  VideoIcon,
} from "lucide-react";
import { useCallLogStore } from "../store/useCallLogStore";
import { useCallStore } from "../store/useCallStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Avatar from "./Avatar";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { dayLabel, timeLabel } from "../lib/chatUtils.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "missed", label: "Missed" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
];

const fmtDuration = (s = 0) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

// what the second line says, how the row is coloured, and which arrow it gets
const describe = (log) => {
  const kind = log.media === "video" ? "video" : "voice";
  const dir = log.direction === "incoming" ? "Incoming" : "Outgoing";
  switch (log.outcome) {
    case "answered":
      return { text: `${dir} ${kind} · ${fmtDuration(log.durationSec)}`, tone: "ok", Arrow: log.direction === "incoming" ? PhoneIncomingIcon : PhoneOutgoingIcon };
    case "missed":
      return { text: log.offline ? `Missed ${kind} call · you were offline` : `Missed ${kind} call`, tone: "bad", Arrow: PhoneMissedIcon };
    case "declined":
      return { text: log.direction === "incoming" ? `Declined ${kind} call` : `Declined · ${kind}`, tone: "muted", Arrow: PhoneOffIcon };
    case "noanswer":
      return { text: log.offline ? `No answer · they were offline` : `No answer · ${kind}`, tone: "muted", Arrow: PhoneOutgoingIcon };
    case "busy":
      return { text: `Busy · ${kind}`, tone: "muted", Arrow: PhoneOutgoingIcon };
    case "cancelled":
      return { text: `Cancelled · ${kind}`, tone: "muted", Arrow: PhoneOutgoingIcon };
    default:
      return { text: `Ringing… · ${kind}`, tone: "ok", Arrow: PhoneOutgoingIcon };
  }
};

const TONE = { ok: "text-slate-500", muted: "text-slate-500", bad: "text-red-400" };

const stamp = (iso) => {
  const label = dayLabel(iso);
  return label === "Today" ? timeLabel(iso) : label === "Yesterday" ? `Yesterday ${timeLabel(iso)}` : `${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${timeLabel(iso)}`;
};

function CallRow({ log, online, open, onToggle }) {
  const startCall = useCallStore((s) => s.startCall);
  const callBusy = useCallStore((s) => s.status !== "idle");
  const remove = useCallLogStore((s) => s.remove);
  const info = describe(log);
  const { Arrow } = info;
  const peer = log.peer;

  const callBack = (media) => {
    if (callBusy) return toast("Finish your current call first", { icon: "📞" });
    if (!online) return toast(`${peer.fullName} is offline right now`, { icon: "💤" });
    startCall(peer, media);
  };

  const openChat = () => {
    // reuse the chat row when we have one, else a minimal user is enough to open the conversation
    const known = useChatStore.getState().chats.find((c) => c._id === peer._id);
    useChatStore.getState().setSelectedUser(known || peer);
    useChatStore.getState().setActiveTab("chats");
  };

  const QuickIcon = log.media === "video" ? VideoIcon : PhoneIcon;

  return (
    <div className={`rounded-2xl border transition-colors ${open ? "border-white/10 bg-white/[0.05]" : "border-transparent hover:bg-white/[0.04]"}`}>
      <div className="flex items-center gap-1 pr-2">
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${peer.fullName}, ${info.text}, ${stamp(log.startedAt)}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 text-left"
        >
          <Avatar src={peer.profilePic} alt="" online={online} />
          <div className="min-w-0 flex-1">
            <h4 className={`truncate font-semibold ${info.tone === "bad" ? "text-red-400" : "text-slate-100"}`}>{peer.fullName}</h4>
            <p className={`flex items-center gap-1.5 text-sm ${TONE[info.tone]}`}>
              <Arrow className="size-3.5 shrink-0" aria-hidden />
              {log.media === "video" && <VideoIcon className="size-3.5 shrink-0" aria-hidden />}
              <span className="truncate">{info.text}</span>
            </p>
            <p className="text-[11px] text-slate-500">{stamp(log.startedAt)}</p>
          </div>
        </button>
        <button
          onClick={() => callBack(log.media)}
          aria-label={`Call ${peer.fullName} back (${log.media === "video" ? "video" : "voice"})`}
          title={online ? "Call back" : "Offline"}
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            online ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/[0.05] text-slate-500 hover:bg-white/10"
          }`}
        >
          <QuickIcon className="size-5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-2 px-3 pb-3">
              {[
                { label: "Voice", icon: PhoneIcon, run: () => callBack("audio") },
                { label: "Video", icon: VideoIcon, run: () => callBack("video") },
                { label: "Message", icon: MessageCircleIcon, run: openChat },
                { label: "Delete", icon: Trash2Icon, run: () => remove(log._id), danger: true },
              ].map(({ label, icon, run, danger }) => {
                const Icon = icon;
                return (
                  <button
                    key={label}
                    onClick={run}
                    className={`flex flex-col items-center gap-1 rounded-xl border border-white/10 py-2 text-[11px] font-medium transition-colors hover:bg-white/10 ${
                      danger ? "text-red-400 hover:!bg-red-500/10" : "text-slate-300"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CallsList() {
  const logs = useCallLogStore((s) => s.logs);
  const loaded = useCallLogStore((s) => s.loaded);
  const loading = useCallLogStore((s) => s.loading);
  const hasMore = useCallLogStore((s) => s.hasMore);
  const loadingMore = useCallLogStore((s) => s.loadingMore);
  const missedUnseen = useCallLogStore((s) => s.missedUnseen);
  const fetchLogs = useCallLogStore((s) => s.fetchLogs);
  const loadMore = useCallLogStore((s) => s.loadMore);
  const markSeen = useCallLogStore((s) => s.markSeen);
  const clearAll = useCallLogStore((s) => s.clearAll);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  // coming back to the tab refreshes quietly (no skeleton once we have rows)
  useEffect(() => {
    fetchLogs({ silent: useCallLogStore.getState().loaded });
  }, [fetchLogs]);

  // the list is on screen: calls missed so far count as seen (also when one arrives while it is open)
  useEffect(() => {
    if (!loaded || !missedUnseen) return;
    const t = setTimeout(markSeen, 800);
    return () => clearTimeout(t);
  }, [loaded, missedUnseen, markSeen]);

  const shown = useMemo(
    () =>
      logs.filter((l) =>
        filter === "all" ? true : filter === "missed" ? l.outcome === "missed" : l.direction === filter,
      ),
    [logs, filter],
  );

  if (!loaded || loading) return <UsersLoadingSkeleton />;

  let lastDay = "";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-1 pb-3 pt-1" role="group" aria-label="Filter calls">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.id ? "bg-brand-500/25 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        {logs.length > 0 && (
          <button
            onClick={() => window.confirm("Clear your whole call history? The other people keep theirs.") && clearAll()}
            className="ml-auto shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400"
          >
            Clear all
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-bloom-500/15">
            <PhoneIcon className="size-7 text-brand-400" />
          </span>
          <div>
            <h4 className="font-semibold text-slate-100">{logs.length ? "Nothing here" : "No calls yet"}</h4>
            <p className="mt-1 text-sm text-slate-400">
              {logs.length
                ? "No calls match this filter."
                : "Voice and video calls you make, receive or miss will show up here."}
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1" aria-label="Call history">
          {shown.map((log) => {
            const day = dayLabel(log.startedAt);
            const header = day !== lastDay;
            lastDay = day;
            return (
              <Fragment key={log._id}>
                {header && (
                  <li className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500" aria-hidden>
                    {day}
                  </li>
                )}
                <li>
                  <CallRow
                    log={log}
                    online={onlineUsers.includes(log.peer._id)}
                    open={openId === log._id}
                    onToggle={() => setOpenId(openId === log._id ? null : log._id)}
                  />
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      {hasMore && filter === "all" && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mx-auto mt-3 block rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Show older calls"}
        </button>
      )}
    </div>
  );
}
export default CallsList;
