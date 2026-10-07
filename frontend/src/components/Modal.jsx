import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "lucide-react";

// accessible dialog: Escape closes, focus moves inside and returns afterwards
function Modal({ open, onClose, title, children, wide = false }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(2,6,23,.6)] p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`glass-strong flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-soft outline-none sm:rounded-3xl ${
              wide ? "sm:max-w-2xl" : "sm:max-w-md"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 id={titleId} className="text-lg font-semibold text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default Modal;
