import { motion, AnimatePresence } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const { activeTab, selectedUser } = useChatStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 160, damping: 24 }}
      className="glass-strong relative flex h-full w-full max-w-[1500px] overflow-hidden shadow-soft md:m-4 md:h-[calc(100%-2rem)] md:rounded-3xl"
    >
      {/* LEFT SIDE - hidden on phones while a conversation is open */}
      <aside
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full flex-col border-r border-white/10 bg-black/20 md:w-[22rem] md:shrink-0`}
      >
        <ProfileHeader />
        <ActiveTabSwitch />

        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === "chats" ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === "chats" ? 16 : -16 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "chats" ? <ChatsList /> : <ContactList />}
            </motion.div>
          </AnimatePresence>
        </div>
      </aside>

      {/* RIGHT SIDE */}
      <section
        className={`${selectedUser ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-ink-900/30`}
      >
        {selectedUser ? (
          <motion.div
            key={selectedUser._id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ChatContainer />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col"
          >
            <NoConversationPlaceholder />
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
export default ChatPage;
