import { ArrowLeftIcon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import Avatar from "./Avatar";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        {/* phones only: back to the list */}
        <button
          onClick={() => setSelectedUser(null)}
          className="-ml-1 flex size-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeftIcon className="size-5" />
        </button>

        <Avatar src={selectedUser.profilePic} alt={selectedUser.fullName} online={isOnline} />

        <div>
          <h3 className="font-semibold text-white">{selectedUser.fullName}</h3>
          <motion.p
            key={String(isOnline)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm ${isOnline ? "text-emerald-400" : "text-slate-500"}`}
          >
            {isOnline ? "Online" : "Offline"}
          </motion.p>
        </div>
      </div>

      <motion.button
        whileHover={{ rotate: 90 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => setSelectedUser(null)}
        className="hidden size-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:flex"
        aria-label="Close conversation"
      >
        <XIcon className="size-5" />
      </motion.button>
    </div>
  );
}
export default ChatHeader;
