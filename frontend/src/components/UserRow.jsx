import { memo } from "react";
import { BotIcon, FileIcon, ImageIcon } from "lucide-react";
import Avatar from "./Avatar";
import { dayLabel, timeLabel } from "../lib/chatUtils.js";

// "10:42" today, "Yesterday", or a short date - like every messenger
const stamp = (iso) => {
  const label = dayLabel(iso);
  return label === "Today" ? timeLabel(iso) : label === "Yesterday" ? label : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function Preview({ last, mine }) {
  if (!last) return null;
  const prefix = mine ? "You: " : "";
  if (last.deleted) return <span className="italic">{prefix}Message deleted</span>;
  if (last.text) return <span>{prefix}{last.text}</span>;
  if (last.hasImage)
    return (
      <span className="inline-flex items-center gap-1">
        {prefix}
        <ImageIcon className="size-3.5" /> Photo
      </span>
    );
  if (last.fileName)
    return (
      <span className="inline-flex items-center gap-1">
        {prefix}
        <FileIcon className="size-3.5" /> {last.fileName}
      </span>
    );
  return null;
}

// One clickable person: in the chats list (preview, time, unread badge) or in search results (email hint).
const UserRow = memo(function UserRow({ user, online, selected, onSelect, meId, variant = "chat" }) {
  const last = user.lastMessage;
  const unread = user.unreadCount || 0;
  const showChatInfo = variant === "chat" && last;

  return (
    <button
      onClick={() => onSelect(user)}
      aria-label={`${user.fullName}${unread ? `, ${unread} unread` : ""}`}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors duration-150 ${
        selected
          ? "border-brand-500/50 bg-brand-500/15"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.06] active:bg-white/10"
      }`}
    >
      <Avatar src={user.profilePic} alt="" online={user.isBot ? true : online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className={`flex min-w-0 items-center gap-1.5 truncate text-slate-100 ${unread ? "font-bold" : "font-semibold"}`}>
            <span className="truncate">{user.fullName}</span>
            {user.isBot && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-400">
                <BotIcon className="size-3" /> Bot
              </span>
            )}
          </h4>
          {showChatInfo && (
            <time dateTime={last.createdAt} className={`shrink-0 text-[11px] ${unread ? "font-semibold text-brand-400" : "text-slate-500"}`}>
              {stamp(last.createdAt)}
            </time>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`min-w-0 truncate text-sm ${unread ? "font-medium text-slate-200" : "text-slate-500"}`}>
            {showChatInfo ? (
              <Preview last={last} mine={last.senderId === meId} />
            ) : variant === "search" && user.emailHint ? (
              user.emailHint
            ) : (
              <span className={online || user.isBot ? "text-emerald-400" : ""}>
                {user.isBot ? "Always on" : online ? "Online" : "Offline"}
              </span>
            )}
          </p>
          {unread > 0 && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-bloom-500 px-1.5 text-[11px] font-bold text-snow"
              aria-hidden
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});
export default UserRow;
