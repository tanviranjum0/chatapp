import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { usePrefsStore } from "../store/usePrefsStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";
import SearchPanel from "./SearchPanel";
import ForwardModal from "./ForwardModal";
import { dayLabel } from "../lib/chatUtils.js";

const NEAR_BOTTOM_PX = 160;

function ChatContainer() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  const messages = useChatStore((s) => s.messages);
  const isMessagesLoading = useChatStore((s) => s.isMessagesLoading);
  const jumpTarget = useChatStore((s) => s.jumpTarget);
  const lightbox = useChatStore((s) => s.lightbox);
  const searchOpen = useChatStore((s) => s.searchOpen);
  const getMessagesByUserId = useChatStore((s) => s.getMessagesByUserId);
  const jumpToMessage = useChatStore((s) => s.jumpToMessage);
  const authUser = useAuthStore((s) => s.authUser);
  const { translateLang, autoTranslate, smartReplies } = usePrefsStore();

  const scrollerRef = useRef(null);
  const endRef = useRef(null);
  const nearBottom = useRef(true);
  const lastLen = useRef(0);
  const translated = useRef(new Set()); // ids we already tried to auto-translate
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    lastLen.current = 0;
    nearBottom.current = true;
    translated.current = new Set();
    getMessagesByUserId(selectedUser._id);
  }, [selectedUser, getMessagesByUserId]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  // keep the view pinned to new messages, but never yank it while reading old ones
  useEffect(() => {
    if (jumpTarget || !endRef.current) return;
    const last = messages[messages.length - 1];
    const first = lastLen.current === 0;
    const mineLast = last && last.senderId === authUser._id;
    if (first || nearBottom.current || mineLast) {
      endRef.current.scrollIntoView({ behavior: first ? "auto" : "smooth" });
    }
    lastLen.current = messages.length;
  }, [messages, jumpTarget, authUser._id]);

  // search result / reply quote -> scroll there and flash the bubble
  useEffect(() => {
    if (!jumpTarget) return;
    const el = document.getElementById(`msg-${jumpTarget}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(jumpTarget);
    useChatStore.getState().clearJumpTarget();
    const t = setTimeout(() => setFlashId(null), 1700);
    return () => clearTimeout(t);
  }, [jumpTarget, messages]);

  const onJump = useCallback((id) => jumpToMessage(id), [jumpToMessage]);

  // smart replies: refresh suggestions shortly after the conversation settles
  useEffect(() => {
    if (!smartReplies) {
      useChatStore.getState().clearSuggestions();
      return;
    }
    if (isMessagesLoading) return;
    const t = setTimeout(() => useChatStore.getState().loadSuggestions(), 500);
    return () => clearTimeout(t);
  }, [messages, smartReplies, isMessagesLoading]);

  // live translation of incoming messages (newest first, once per message)
  useEffect(() => {
    if (!autoTranslate || !translateLang || isMessagesLoading) return;
    const todo = messages
      .filter(
        (m) =>
          m.senderId !== authUser._id &&
          m.text &&
          !m.deletedAt &&
          !m.isOptimistic &&
          !translated.current.has(m._id),
      )
      .slice(-15);
    todo.forEach((m, i) => {
      translated.current.add(m._id);
      setTimeout(() => useChatStore.getState().translateMessage(m._id, translateLang), i * 250);
    });
  }, [messages, autoTranslate, translateLang, isMessagesLoading, authUser._id]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        useChatStore.setState({ lightbox: null });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox]);

  let lastDay = "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ChatHeader />

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth py-6"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${selectedUser.fullName}`}
      >
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="mx-auto max-w-3xl space-y-3 px-4 pt-6 sm:px-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const day = dayLabel(msg.createdAt);
                const showDay = day !== lastDay;
                lastDay = day;
                return (
                  <Fragment key={msg._id}>
                    {showDay && (
                      <div className="flex justify-center py-1">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-400">
                          {day}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      msg={msg}
                      mine={msg.senderId === authUser._id}
                      flash={flashId === msg._id}
                      onJump={onJump}
                    />
                  </Fragment>
                );
              })}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />

      <AnimatePresence>{searchOpen && <SearchPanel />}</AnimatePresence>
      <ForwardModal />

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => useChatStore.setState({ lightbox: null })}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-[rgba(0,0,0,.82)] p-4 backdrop-blur-md"
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
              className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full bg-snow/15 text-snow hover:bg-snow/25"
              aria-label="Close image"
            >
              <XIcon className="size-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatContainer;
