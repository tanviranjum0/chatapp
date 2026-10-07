import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WifiOffIcon, RefreshCwIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

// tells people when they are offline or the live connection is being restored
function ConnectionBanner() {
  const status = useAuthStore((s) => s.socketStatus);
  const loggedIn = useAuthStore((s) => Boolean(s.authUser));
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // "connecting" right after login is normal; only "reconnecting" means we lost it
  const text = !online ? "You're offline - messages will send when you're back." : loggedIn && status === "reconnecting" ? "Reconnecting…" : null;

  return (
    <AnimatePresence>
      {text && (
        // flex centering (not translate classes): framer-motion owns the inline transform
        <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex justify-center px-3">
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-soft"
          >
            {online ? <RefreshCwIcon className="size-4 shrink-0 animate-spin" /> : <WifiOffIcon className="size-4 shrink-0" />}
            <span className="min-w-0">{text}</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default ConnectionBanner;
