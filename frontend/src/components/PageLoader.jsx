import { motion } from "motion/react";
import { MessageCircleIcon } from "lucide-react";

function PageLoader() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6">
      <div className="relative">
        <motion.span
          className="absolute inset-0 rounded-3xl bg-brand-500/40 blur-xl"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-bloom-500 shadow-glow"
          animate={{ rotate: [0, 8, -8, 0], y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <MessageCircleIcon className="size-9 text-white" />
        </motion.div>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-brand-400"
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
export default PageLoader;
