import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import {
  CheckIcon,
  ImageIcon,
  PaperclipIcon,
  PencilIcon,
  ReplyIcon,
  SendIcon,
  SmileIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { fileIconFor, formatBytes } from "../lib/chatUtils.js";
import { resizeToFit } from "../lib/imageUtils";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // photos are shrunk to 1600px before upload
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const FILE_TYPES = new Set([
  "application/pdf", "text/plain", "text/csv", "application/zip", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/mpeg", "audio/wav", "audio/ogg", "video/mp4",
]);
const FILE_ACCEPT = ".pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.ogg,.mp4";

const iconBtn =
  "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-400 transition-colors hover:bg-white/10 hover:text-white";

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null); // { name, size, type, data }
  const [emojiOpen, setEmojiOpen] = useState(false);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const textRef = useRef(null);
  const pickerWrapRef = useRef(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const isSoundEnabled = useChatStore((s) => s.isSoundEnabled);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const suggestions = useChatStore((s) => s.suggestions);
  const selectedUser = useChatStore((s) => s.selectedUser);
  const authUser = useAuthStore((s) => s.authUser);

  const editing = Boolean(editingMessage);
  const canSend = Boolean(text.trim() || (!editing && (imagePreview || file)));

  // entering edit mode loads the message text; reply focuses the box
  useEffect(() => {
    if (editingMessage) setText(editingMessage.text || "");
    if (editingMessage || replyingTo) textRef.current?.focus();
  }, [editingMessage, replyingTo]);

  // a new conversation starts with an empty composer
  useEffect(() => {
    setText("");
    setImagePreview(null);
    setFile(null);
    setEmojiOpen(false);
  }, [selectedUser._id]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e) => !pickerWrapRef.current?.contains(e.target) && setEmojiOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [emojiOpen]);

  const reset = () => {
    setText("");
    setImagePreview(null);
    setFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelContext = () => {
    useChatStore.setState({ replyingTo: null, editingMessage: null });
    if (editing) setText("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    if (editing) {
      const ok = await editMessage(editingMessage._id, text.trim());
      if (ok) setText("");
      return;
    }

    useChatStore.getState().clearSuggestions();
    const payload = { text: text.trim(), image: imagePreview, file };
    reset();
    setEmojiOpen(false);
    await sendMessage(payload);
  };

  const handleImageChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please select an image file");
    if (f.size > MAX_IMAGE_BYTES) {
      e.target.value = "";
      return toast.error("Image is too large (max 20MB)");
    }
    setFile(null);
    try {
      setImagePreview(await resizeToFit(f));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!FILE_TYPES.has(f.type)) {
      e.target.value = "";
      return toast.error("That file type isn't supported");
    }
    if (f.size > MAX_FILE_BYTES) {
      e.target.value = "";
      return toast.error("File is too large (max 4MB)");
    }
    setImagePreview(null);
    setFile({ name: f.name, size: f.size, type: f.type, data: await readAsDataUrl(f) });
  };

  const insertEmoji = (emoji) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((t) => (t.slice(0, start) + emoji + t.slice(end)).slice(0, 2000));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const sendSticker = (s) => {
    setEmojiOpen(false);
    sendMessage({ text: s });
  };

  const sendSuggestion = (reply) => {
    useChatStore.getState().clearSuggestions();
    sendMessage({ text: reply });
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" && (replyingTo || editing)) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      cancelContext();
    }
  };

  const FileIcon = file ? fileIconFor(file.type, file.name) : null;
  const contextLabel = editing ? "Editing message" : replyingTo ? "Replying" : null;
  const contextText = editing ? editingMessage.text : replyingTo?.text || (replyingTo?.image ? "📷 Photo" : replyingTo?.file?.name);

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      {/* smart replies */}
      <AnimatePresence>
        {!editing && suggestions.replies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mb-2 flex max-w-3xl items-center gap-2 overflow-x-auto pb-1"
            aria-label="Suggested replies"
          >
            <SparklesIcon className="size-4 shrink-0 text-bloom-400" aria-hidden />
            {suggestions.replies.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => sendSuggestion(r)}
                className="shrink-0 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-sm text-slate-100 transition-colors hover:bg-brand-500/25"
              >
                {r}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* reply / edit context */}
      <AnimatePresence>
        {contextLabel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mb-2 flex max-w-3xl items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2"
          >
            {editing ? <PencilIcon className="size-4 text-brand-400" /> : <ReplyIcon className="size-4 text-brand-400" />}
            <div className="min-w-0 flex-1 border-l-2 border-brand-400 pl-3">
              <p className="text-xs font-semibold text-brand-400">
                {editing
                  ? contextLabel
                  : `Replying to ${replyingTo.senderId === authUser._id ? "yourself" : selectedUser.fullName}`}
              </p>
              <p className="truncate text-sm text-slate-300">{contextText}</p>
            </div>
            <button
              type="button"
              onClick={cancelContext}
              aria-label="Cancel"
              className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <XIcon className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* attachment previews */}
      <AnimatePresence>
        {(imagePreview || file) && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mb-3 flex max-w-3xl items-center overflow-hidden"
          >
            <div className="relative">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="size-20 rounded-xl border border-white/15 object-cover"
                />
              ) : (
                <div className="flex max-w-xs items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] p-3 pr-6">
                  <FileIcon className="size-8 shrink-0 text-brand-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setImagePreview(null);
                  setFile(null);
                }}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-ink-700 text-slate-200 shadow hover:bg-red-500 hover:text-snow"
                type="button"
                aria-label="Remove attachment"
              >
                <XIcon className="size-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-center gap-2 sm:gap-3">
        <div ref={pickerWrapRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label="Emoji and stickers"
            aria-expanded={emojiOpen}
            className={iconBtn}
          >
            <SmileIcon className="size-5" />
          </motion.button>
          {emojiOpen && (
            <div className="absolute bottom-14 left-0 z-30">
              <EmojiPicker onPick={insertEmoji} onSticker={editing ? undefined : sendSticker} />
            </div>
          )}
        </div>

        <input
          ref={textRef}
          type="text"
          value={text}
          maxLength={2000}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            setText(e.target.value);
            isSoundEnabled && playRandomKeyStrokeSound();
          }}
          aria-label="Message"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-100 outline-none transition-all placeholder:text-slate-500 hover:border-white/20 focus:border-brand-500/70 focus:bg-white/[0.09] focus:shadow-[0_0_0_4px_rgba(109,124,255,.18)]"
          placeholder={editing ? "Edit your message…" : "Type your message..."}
        />

        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="hidden" />
        <input type="file" accept={FILE_ACCEPT} ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        {!editing && (
          <>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label="Attach image"
              className={`${iconBtn} ${imagePreview ? "!text-brand-400" : ""}`}
            >
              <ImageIcon className="size-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              className={`${iconBtn} hidden sm:flex ${file ? "!text-brand-400" : ""}`}
            >
              <PaperclipIcon className="size-5" />
            </motion.button>
          </>
        )}
        <motion.button
          whileHover={canSend ? { scale: 1.08, rotate: -8 } : undefined}
          whileTap={canSend ? { scale: 0.88 } : undefined}
          type="submit"
          disabled={!canSend}
          aria-label={editing ? "Save edit" : "Send message"}
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-bloom-500 text-snow shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {editing ? <CheckIcon className="size-5" /> : <SendIcon className="size-5" />}
        </motion.button>
      </form>
    </div>
  );
}
export default MessageInput;
