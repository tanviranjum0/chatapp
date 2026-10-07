import { ArrowLeftIcon, BotIcon, PhoneIcon, SearchIcon, VideoIcon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import Avatar from "./Avatar";

const headBtn =
  "flex size-10 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

function ChatHeader() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const searchOpen = useChatStore((s) => s.searchOpen);
  const setSearchOpen = useChatStore((s) => s.setSearchOpen);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const callStatus = useCallStore((s) => s.status);
  const startCall = useCallStore((s) => s.startCall);

  const isBot = Boolean(selectedUser.isBot);
  const isOnline = isBot || onlineUsers.includes(selectedUser._id);
  const canCall = !isBot && isOnline && callStatus === "idle";

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* phones only: back to the list */}
        <button
          onClick={() => setSelectedUser(null)}
          className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeftIcon className="size-5" />
        </button>

        <Avatar src={selectedUser.profilePic} alt={selectedUser.fullName} online={isOnline} />

        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate font-semibold text-white">
            {selectedUser.fullName}
            {isBot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-400">
                <BotIcon className="size-3" /> Bot
              </span>
            )}
          </h3>
          <motion.p
            key={String(isOnline)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm ${isOnline ? "text-emerald-400" : "text-slate-500"}`}
          >
            {isBot ? "Always on" : isOnline ? "Online" : "Offline"}
          </motion.p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={`${headBtn} ${searchOpen ? "!bg-brand-500/20 !text-white" : ""}`}
          aria-label="Search in conversation"
          aria-pressed={searchOpen}
        >
          <SearchIcon className="size-5" />
        </button>
        {!isBot && (
          <>
            <button
              onClick={() => startCall(selectedUser, "audio")}
              disabled={!canCall}
              className={headBtn}
              aria-label="Start voice call"
              title={isOnline ? "Voice call" : "Unavailable while offline"}
            >
              <PhoneIcon className="size-5" />
            </button>
            <button
              onClick={() => startCall(selectedUser, "video")}
              disabled={!canCall}
              className={headBtn}
              aria-label="Start video call"
              title={isOnline ? "Video call" : "Unavailable while offline"}
            >
              <VideoIcon className="size-5" />
            </button>
          </>
        )}
        <motion.button
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => setSelectedUser(null)}
          className="hidden size-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:flex"
          aria-label="Close conversation"
        >
          <XIcon className="size-5" />
        </motion.button>
      </div>
    </div>
  );
}
export default ChatHeader;
