import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // server rejects anything bigger

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  const canSend = Boolean(text.trim() || imagePreview);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large (max 3MB)");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-4">
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mb-3 flex max-w-3xl items-center overflow-hidden"
          >
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="size-20 rounded-xl border border-white/15 object-cover"
              />
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={removeImage}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-ink-700 text-slate-200 shadow hover:bg-red-500"
                type="button"
                aria-label="Remove image"
              >
                <XIcon className="size-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSendMessage} className="mx-auto flex max-w-3xl items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={text}
          maxLength={2000}
          onChange={(e) => {
            setText(e.target.value);
            isSoundEnabled && playRandomKeyStrokeSound();
          }}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-100 outline-none transition-all placeholder:text-slate-500 hover:border-white/20 focus:border-brand-500/70 focus:bg-white/[0.09] focus:shadow-[0_0_0_4px_rgba(109,124,255,.18)]"
          placeholder="Type your message..."
        />

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] transition-colors hover:bg-white/10 ${
            imagePreview ? "text-brand-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <ImageIcon className="size-5" />
        </motion.button>
        <motion.button
          whileHover={canSend ? { scale: 1.08, rotate: -8 } : undefined}
          whileTap={canSend ? { scale: 0.88 } : undefined}
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-bloom-500 text-white shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <SendIcon className="size-5" />
        </motion.button>
      </form>
    </div>
  );
}
export default MessageInput;
