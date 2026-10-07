import { motion } from "motion/react";
import { MessagesSquareIcon, UsersIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const TABS = [
  { id: "chats", label: "Chats", icon: MessagesSquareIcon },
  { id: "contacts", label: "Contacts", icon: UsersIcon },
];

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="m-3 flex rounded-2xl border border-white/10 bg-black/25 p-1">
      {TABS.map(({ id, label, icon }) => {
        const Icon = icon;
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-colors ${
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
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
export default ActiveTabSwitch;
