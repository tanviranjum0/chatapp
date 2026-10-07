import { Fragment, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
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
const SearchPanel = lazy(() => import("./SearchPanel"));
const ForwardModal = lazy(() => import("./ForwardModal"));
import { dayLabel } from "../lib/chatUtils.js";

const NEAR_BOTTOM_PX = 160;
const INITIAL_RENDER = 80; // long histories render in pages: far fewer DOM nodes to lay out
const RENDER_STEP = 100;

// The conversation can be closed (back button, X, Esc) while its panel is still on screen animating out.
// Everything below needs a user, so this guard renders nothing once there is none.
function ChatContainer() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  if (!selectedUser) return null;
  return <Conversation key={selectedUser._id} selectedUser={selectedUser} />;
}

function Conversation({ selectedUser }) {
  const messages = useChatStore((s) => s.messages);
  const isMessagesLoading = useChatStore((s) => s.isMessagesLoading);
  const jumpTarget = useChatStore((s) => s.jumpTarget);
  const lightbox = useChatStore((s) => s.lightbox);
  const searchOpen = useChatStore((s) => s.searchOpen);
  const forwarding = useChatStore((s) => Boolean(s.forwardingMessage));
  const getMessagesByUserId = useChatStore((s) => s.getMessagesByUserId);
  const jumpToMessage = useChatStore((s) => s.jumpToMessage);
  const authUser = useAuthStore((s) => s.authUser);
  const translateLang = usePrefsStore((s) => s.translateLang);
  const autoTranslate = usePrefsStore((s) => s.autoTranslate);
  const smartReplies = usePrefsStore((s) => s.smartReplies);

  const scrollerRef = useRef(null);
  const endRef = useRef(null);
  const nearBottom = useRef(true);
  const lastLen = useRef(0);
  const translated = useRef(new Set()); // ids we already tried to auto-translate
  const seen = useRef(new Set()); // ids already on screen
  const freshIds = useRef(new Set()); // ids that arrived while watching: they animate in
  const hydrated = useRef(false);
  const [flashId, setFlashId] = useState(null);
  const [renderCount, setRenderCount] = useState(INITIAL_RENDER);

  useEffect(() => {
    lastLen.current = 0;
    nearBottom.current = true;
    translated.current = new Set();
    seen.current = new Set();
    freshIds.current = new Set();
    hydrated.current = false;
    setRenderCount(INITIAL_RENDER);
    getMessagesByUserId(selectedUser._id);
  }, [selectedUser, getMessagesByUserId]);

  // the history that was already there never animates; only new arrivals do
  useEffect(() => {
    if (!isMessagesLoading) hydrated.current = true;
  }, [isMessagesLoading, messages]);

  // opening the tab / window again counts as reading the open conversation
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) useChatStore.getState().markConversationRead(selectedUser._id);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [selectedUser._id]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  // keep the view pinned to new messages, but never yank it while reading old ones
  useEffect(() => {
    if (jumpTarget || !endRef.current) return;
    const last = messages[messages.length - 1];
    const first = lastLen.current === 0;
    const grew = messages.length > lastLen.current;
    const mineLast = last && last.senderId === authUser._id;
    // follow new messages only when some arrived (not when e.g. a search jump just finished)
    if (first || (grew && (nearBottom.current || mineLast))) {
      endRef.current.scrollIntoView({ behavior: first ? "auto" : "smooth" });
    }
    lastLen.current = messages.length;
  }, [messages, jumpTarget, authUser._id]);

  // search result / reply quote -> scroll there and flash the bubble
  useEffect(() => {
    if (!jumpTarget) return;
    const el = document.getElementById(`msg-${jumpTarget}`);
    if (!el) {
      // not rendered yet because it is in the older part of the history
      const index = messages.findIndex((m) => m._id === jumpTarget);
      if (index >= 0 && messages.length - index > renderCount) setRenderCount(messages.length - index + 20);
      return;
    }
    nearBottom.current = false; // we are reading history now: do not snap back to the newest message
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(jumpTarget);
    useChatStore.getState().clearJumpTarget();
    const t = setTimeout(() => setFlashId(null), 1700);
    return () => clearTimeout(t);
  }, [jumpTarget, messages, renderCount]);

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

  // live translation: new incoming messages go out in ONE request per burst, errors stay silent
  useEffect(() => {
    if (!autoTranslate || !translateLang || isMessagesLoading) return;
    const ids = messages
      .filter(
        (m) =>
          m.senderId !== authUser._id &&
          m.text &&
          !m.deletedAt &&
          !m.isOptimistic &&
          !translated.current.has(m._id + translateLang),
      )
      .slice(-20)
      .map((m) => m._id);
    if (!ids.length) return;
    ids.forEach((id) => translated.current.add(id + translateLang));
    useChatStore.getState().translateMessages(ids, translateLang);
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

  const hiddenCount = Math.max(0, messages.length - renderCount);
  const visibleMessages = hiddenCount ? messages.slice(-renderCount) : messages;

  // keep the reading position when older messages are inserted above
  const showEarlier = () => {
    const el = scrollerRef.current;
    const before = el?.scrollHeight ?? 0;
    setRenderCount((n) => n + RENDER_STEP);
    requestAnimationFrame(() => {
      if (el) el.scrollTop += el.scrollHeight - before;
    });
  };

  let lastDay = "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ChatHeader />

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-6"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${selectedUser.fullName}`}
      >
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="mx-auto max-w-3xl space-y-3 px-4 pt-6 sm:px-6">
            {hiddenCount > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={showEarlier}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Show {Math.min(hiddenCount, RENDER_STEP)} earlier messages
                </button>
              </div>
            )}
            {(
              <>
              {visibleMessages.map((msg) => {
                if (hydrated.current && !seen.current.has(msg._id)) freshIds.current.add(msg._id);
                seen.current.add(msg._id);
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
                      fresh={freshIds.current.has(msg._id)}
                      onJump={onJump}
                    />
                  </Fragment>
                );
              })}
              </>
            )}
            <div ref={endRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />

      <Suspense fallback={null}>
        <AnimatePresence>{searchOpen && <SearchPanel />}</AnimatePresence>
        {forwarding && <ForwardModal />}
      </Suspense>

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
