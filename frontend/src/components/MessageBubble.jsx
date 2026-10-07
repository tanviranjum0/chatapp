import { memo, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  BanIcon,
  CheckCheckIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ForwardIcon,
  ImageIcon,
  LanguagesIcon,
  Loader2Icon,
  PencilIcon,
  ReplyIcon,
  SmilePlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { usePrefsStore } from "../store/usePrefsStore";
import EmojiPicker from "./EmojiPicker";
import {
  LANGUAGES,
  QUICK_REACTIONS,
  describeLink,
  extractUrls,
  fileIconFor,
  formatBytes,
  isStickerText,
  linkify,
  timeLabel,
} from "../lib/chatUtils.js";

const toolBtn =
  "flex size-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/15 hover:text-white focus-visible:bg-white/15";

function Linkified({ text }) {
  return (
    <p className="break-words whitespace-pre-wrap">
      {linkify(text).map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline decoration-1 underline-offset-2 hover:opacity-80"
          >
            {part.url}
          </a>
        ),
      )}
    </p>
  );
}

function LinkCard({ url, mine }) {
  const info = describeLink(url);
  if (!info) return null;
  const Icon = info.icon;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`mt-2 flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
        mine ? "border-snow/25 bg-snow/10 hover:bg-snow/20" : "border-white/10 bg-white/[0.06] hover:bg-white/10"
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/25">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{info.label}</span>
        <span className="block truncate text-xs opacity-70">{info.generic ? url : info.host}</span>
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 opacity-60" />
    </a>
  );
}

function ReplyQuote({ preview, mine, onJump }) {
  const { authUser } = useAuthStore();
  const who = preview.senderId === authUser._id ? "You" : "Them";
  const label = preview.deleted
    ? "Deleted message"
    : preview.text || (preview.hasImage ? "📷 Photo" : preview.fileName ? `📎 ${preview.fileName}` : "Message");
  return (
    <button
      type="button"
      onClick={() => !preview.deleted && onJump(preview._id)}
      className={`mb-2 block w-full rounded-lg border-l-4 px-3 py-1.5 text-left text-xs ${
        mine ? "border-snow/70 bg-snow/15" : "border-brand-400 bg-white/[0.08]"
      }`}
    >
      <span className="block font-semibold opacity-90">{who}</span>
      <span className="line-clamp-2 break-words opacity-80">{label}</span>
    </button>
  );
}

const MessageBubble = memo(function MessageBubble({ msg, mine, flash, fresh, onJump }) {
  const { authUser } = useAuthStore();
  const translation = useChatStore((s) => s.translations[msg._id]);
  const {
    setReplyingTo,
    setEditingMessage,
    setForwardingMessage,
    deleteMessage,
    reactToMessage,
    translateMessage,
    hideTranslation,
  } = useChatStore.getState();
  const translateLang = usePrefsStore((s) => s.translateLang);
  const autoTranslate = usePrefsStore((s) => s.autoTranslate);

  const [showTools, setShowTools] = useState(false); // tap to reveal on touch screens
  // the action toolbar is built lazily (first hover / focus / tap): 300 bubbles x 7 buttons is a lot of DOM
  const [armed, setArmed] = useState(false);
  const [picker, setPicker] = useState(false);
  const [bigPicker, setBigPicker] = useState(false);
  const rootRef = useRef(null);

  // close the reaction popover when clicking anywhere else
  useEffect(() => {
    if (!picker && !showTools) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setPicker(false);
        setBigPicker(false);
        setShowTools(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [picker, showTools]);

  const deleted = Boolean(msg.deletedAt);
  const sticker = !deleted && !msg.image && !msg.file && !msg.replyTo && isStickerText(msg.text);
  const urls = !deleted && msg.text ? extractUrls(msg.text) : [];

  // reactions grouped by emoji
  const grouped = {};
  for (const r of msg.reactions || []) {
    (grouped[r.emoji] ||= []).push(r.userId);
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text || "");
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const onTranslate = () => {
    if (translation) hideTranslation(msg._id);
    else translateMessage(msg._id, translateLang || "en");
  };

  const react = (emoji) => {
    reactToMessage(msg._id, emoji);
    setPicker(false);
    setBigPicker(false);
  };

  const toolsVisible = showTools || picker
    ? "opacity-100"
    : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

  const bubbleTone = mine
    ? "rounded-br-md bg-gradient-to-br from-brand-600 to-bloom-500 text-snow"
    : "rounded-bl-md border border-white/10 bg-white/[0.07] text-slate-100";

  return (
    <div
      id={`msg-${msg._id}`}
      style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
      className={`msg-row flex ${mine ? "justify-end" : "justify-start"} ${fresh ? "msg-in" : ""} ${
        msg.isOptimistic ? "opacity-70" : ""
      }`}
    >
      <div
        ref={rootRef}
        onPointerEnter={() => !armed && setArmed(true)}
        onFocus={() => !armed && setArmed(true)}
        className="group relative max-w-[88%] sm:max-w-[72%]"
      >
        {/* hover / tap toolbar */}
        {!deleted && !msg.isOptimistic && (armed || showTools || picker) && (
          <div
            className={`absolute -top-9 z-20 flex items-center gap-0.5 rounded-xl border border-white/10 bg-ink-800/95 p-1 shadow-soft backdrop-blur-xl transition-opacity ${toolsVisible} ${
              mine ? "right-0" : "left-0"
            }`}
            role="toolbar"
            aria-label="Message actions"
          >
            <button className={toolBtn} aria-label="React" onClick={() => setPicker((v) => !v)}>
              <SmilePlusIcon className="size-4" />
            </button>
            <button className={toolBtn} aria-label="Reply" onClick={() => setReplyingTo(msg)}>
              <ReplyIcon className="size-4" />
            </button>
            <button className={toolBtn} aria-label="Forward" onClick={() => setForwardingMessage(msg)}>
              <ForwardIcon className="size-4" />
            </button>
            {msg.text && (
              <>
                <button className={toolBtn} aria-label="Translate" onClick={onTranslate}>
                  {translation?.status === "loading" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <LanguagesIcon className="size-4" />
                  )}
                </button>
                <button className={toolBtn} aria-label="Copy text" onClick={copy}>
                  <CopyIcon className="size-4" />
                </button>
              </>
            )}
            {mine && msg.text && (
              <button className={toolBtn} aria-label="Edit" onClick={() => setEditingMessage(msg)}>
                <PencilIcon className="size-4" />
              </button>
            )}
            {mine && (
              <button
                className={`${toolBtn} hover:!text-red-400`}
                aria-label="Delete"
                onClick={() => window.confirm("Delete this message for everyone?") && deleteMessage(msg._id)}
              >
                <Trash2Icon className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* reaction popover */}
        {picker && (
          <div className={`absolute top-0 z-30 ${mine ? "right-0" : "left-0"}`}>
            {bigPicker ? (
              <EmojiPicker onPick={react} />
            ) : (
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-ink-800/95 px-2 py-1.5 shadow-soft backdrop-blur-xl">
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => react(e)}
                    aria-label={`React ${e}`}
                    className="rounded-full p-1 text-xl transition-transform hover:scale-125"
                  >
                    {e}
                  </button>
                ))}
                <button
                  onClick={() => setBigPicker(true)}
                  aria-label="More emoji"
                  className="flex size-7 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* the bubble */}
        {deleted ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-2.5 text-sm italic text-slate-400">
            <BanIcon className="size-4" /> This message was deleted
          </div>
        ) : sticker ? (
          <div
            className={`select-none text-6xl leading-tight ${flash ? "msg-flash rounded-2xl" : ""}`}
            onClick={() => setShowTools((v) => !v)}
          >
            {msg.text}
          </div>
        ) : (
          <div
            tabIndex={0}
            onClick={(e) => {
              if (!e.target.closest("a,button,img")) {
                setArmed(true);
                setShowTools((v) => !v);
              }
            }}
            className={`rounded-2xl px-4 py-2.5 shadow-lg ${bubbleTone} ${flash ? "msg-flash" : ""}`}
          >
            {msg.forwarded && (
              <p className="mb-1 flex items-center gap-1 text-[11px] italic opacity-75">
                <ForwardIcon className="size-3" /> Forwarded
              </p>
            )}
            {msg.replyPreview && <ReplyQuote preview={msg.replyPreview} mine={mine} onJump={onJump} />}

            {msg.image && (
              <img
                src={msg.image}
                alt="Photo in chat"
                loading="lazy"
                decoding="async"
                onClick={() => useChatStore.setState({ lightbox: msg.image })}
                className="mb-1 max-h-60 w-full cursor-zoom-in rounded-xl object-cover"
              />
            )}

            {msg.file && (
              <a
                href={msg.file.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                download={msg.file.name}
                className={`mb-1 flex items-center gap-3 rounded-xl p-2.5 ${
                  mine ? "bg-snow/15 hover:bg-snow/25" : "bg-white/[0.07] hover:bg-white/10"
                }`}
              >
                {(() => {
                  const Icon = fileIconFor(msg.file.mimeType, msg.file.name);
                  return <Icon className="size-8 shrink-0" />;
                })()}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{msg.file.name}</span>
                  <span className="block text-xs opacity-70">{formatBytes(msg.file.size)}</span>
                </span>
                {msg.file.url ? (
                  <DownloadIcon className="size-5 shrink-0" />
                ) : (
                  <ImageIcon className="size-5 shrink-0 opacity-40" />
                )}
              </a>
            )}

            {msg.text && <Linkified text={msg.text} />}
            {urls.map((u) => (
              <LinkCard key={u} url={u} mine={mine} />
            ))}

            {translation?.status === "done" && !translation.same && (
              <div className="mt-2 border-t border-current/20 pt-2 text-sm">
                <p className="break-words whitespace-pre-wrap">{translation.text}</p>
                <button
                  onClick={() => hideTranslation(msg._id)}
                  className="mt-1 text-[11px] underline opacity-75 hover:opacity-100"
                >
                  Translated to {LANGUAGES[translation.lang] || translation.lang} · hide
                </button>
              </div>
            )}
            {translation?.status === "done" && translation.same && !autoTranslate && (
              <p className="mt-1 text-[11px] opacity-70">Already in {LANGUAGES[translation.lang] || translation.lang}</p>
            )}
            {translation?.status === "loading" && (
              <p className="mt-2 flex items-center gap-1 text-xs opacity-75">
                <Loader2Icon className="size-3 animate-spin" /> Translating…
              </p>
            )}
            {translation?.status === "error" && (
              <button
                onClick={() => translateMessage(msg._id, translation.lang)}
                className="mt-2 flex items-center gap-1 text-xs underline opacity-80 hover:opacity-100"
              >
                Couldn't translate - tap to retry
              </button>
            )}

            <p className="mt-1 text-right text-[11px] opacity-70">
              {msg.editedAt && <span className="mr-1">edited ·</span>}
              {timeLabel(msg.createdAt)}
              {mine && (
                <span
                  className={`ml-1 inline-flex align-[-2px] ${msg.readAt ? "text-sky-200 opacity-100" : ""}`}
                  role="img"
                  aria-label={msg.isOptimistic ? "Sending" : msg.readAt ? "Read" : "Sent"}
                >
                  {msg.isOptimistic ? <ClockIcon className="size-3" /> : msg.readAt ? <CheckCheckIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
                </span>
              )}
            </p>
          </div>
        )}

        {/* reactions */}
        {Object.keys(grouped).length > 0 && (
          <div className={`-mt-1.5 flex flex-wrap gap-1 px-2 ${mine ? "justify-end" : "justify-start"}`}>
            {Object.entries(grouped).map(([emoji, users]) => {
              const reacted = users.includes(authUser._id);
              return (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  aria-label={`${emoji} ${users.length}, ${reacted ? "remove your reaction" : "react"}`}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow transition-transform hover:scale-105 ${
                    reacted
                      ? "border-brand-500/70 bg-brand-500/25 text-white"
                      : "border-white/15 bg-ink-800/90 text-slate-200"
                  }`}
                >
                  <span className="text-sm">{emoji}</span>
                  {users.length > 1 && <span>{users.length}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageBubble;
