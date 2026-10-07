import { MessageCircleIcon } from "lucide-react";
import { motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";

function NoChatsFound() {
  const { setActiveTab } = useChatStore();

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-bloom-500/15"
      >
        <MessageCircleIcon className="size-8 text-brand-400" />
      </motion.div>
      <div>
        <h4 className="mb-1 font-semibold text-slate-100">No conversations yet</h4>
        <p className="px-6 text-sm text-slate-400">
          Search for a friend by name or email in the contacts tab to start chatting
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setActiveTab("contacts")}
        className="rounded-xl bg-brand-500/15 px-4 py-2 text-sm font-semibold text-brand-400 transition-colors hover:bg-brand-500/25"
      >
        Find contacts
      </motion.button>
    </div>
  );
}
export default NoChatsFound;
