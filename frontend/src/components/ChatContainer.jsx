import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === "Escape" && (e.stopPropagation(), setLightbox(null));
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox]);

  return (
    <>
      <ChatHeader />
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth py-6">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const mine = msg.senderId === authUser._id;
                return (
                  <motion.div
                    key={msg._id}
                    layout="position"
                    initial={{ opacity: 0, y: 16, scale: 0.92 }}
                    animate={{ opacity: msg.isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-lg sm:max-w-[70%] ${
                        mine
                          ? "rounded-br-md bg-gradient-to-br from-brand-600 to-bloom-500 text-white"
                          : "rounded-bl-md border border-white/10 bg-white/[0.07] text-slate-100"
                      }`}
                    >
                      {msg.image && (
                        <motion.img
                          whileHover={{ scale: 1.02 }}
                          src={msg.image}
                          alt="Shared"
                          loading="lazy"
                          onClick={() => setLightbox(msg.image)}
                          className="mb-1 max-h-60 w-full cursor-zoom-in rounded-xl object-cover"
                        />
                      )}
                      {msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>}
                      <p className="mt-1 text-right text-[11px] opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {/* 👇 scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              src={lightbox}
              alt="Full size"
              className="max-h-full max-w-full rounded-2xl shadow-soft"
            />
            <button
              className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close image"
            >
              <XIcon className="size-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatContainer;
