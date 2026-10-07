import { motion } from "motion/react";
import { MessagesSquareIcon, PhoneIcon, UsersIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useCallLogStore } from "../store/useCallLogStore";

const TABS = [
  { id: "chats", label: "Chats", icon: MessagesSquareIcon },
  { id: "calls", label: "Calls", icon: PhoneIcon },
  { id: "contacts", label: "Contacts", icon: UsersIcon },
];

function ActiveTabSwitch() {
  const activeTab = useChatStore((s) => s.activeTab);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const unread = useChatStore((s) => s.chats.reduce((n, c) => n + (c.unreadCount || 0), 0));
  const missed = useCallLogStore((s) => s.missedUnseen);
  const badges = { chats: unread, calls: missed };

  return (
    <div className="m-3 flex rounded-2xl border border-white/10 bg-black/25 p-1" role="tablist" aria-label="Sections">
      {TABS.map(({ id, label, icon }) => {
        const Icon = icon;
        const active = activeTab === id;
        const count = active ? 0 : badges[id] || 0;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            aria-label={count ? `${label}, ${count} new` : label}
            onClick={() => setActiveTab(id)}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
              active ? "text-snow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {active && (
              <motion.span
                layoutId="active-tab-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-bloom-500 shadow-glow"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="relative size-4 shrink-0" />
            <span className="relative truncate">{label}</span>
            {count > 0 && (
              <span
                className={`relative flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-snow ${
                  id === "calls" ? "bg-red-500" : "bg-bloom-500"
                }`}
                aria-hidden
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
export default ActiveTabSwitch;
