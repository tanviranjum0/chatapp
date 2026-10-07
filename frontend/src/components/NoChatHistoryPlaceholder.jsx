import { MessageCircleIcon } from "lucide-react";
import { motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import { fadeUp, stagger } from "../lib/motion";

const QUICK_REPLIES = ["👋 Say Hello", "🤝 How are you?", "📅 Meet up soon?"];

const NoChatHistoryPlaceholder = ({ name }) => {
  const { sendMessage } = useChatStore();

  return (
    <motion.div
      variants={stagger(0.08)}
      initial="hidden"
      animate="show"
      className="flex h-full flex-col items-center justify-center p-6 text-center"
    >
      <motion.div
        variants={fadeUp}
        className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-bloom-500/15"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <MessageCircleIcon className="size-8 text-brand-400" />
        </motion.div>
      </motion.div>
      <motion.h3 variants={fadeUp} className="mb-3 text-lg font-semibold text-white">
        Start your conversation with {name}
      </motion.h3>
      <motion.div variants={fadeUp} className="mb-5 flex max-w-md flex-col space-y-3">
        <p className="text-sm text-slate-400">
          This is the beginning of your conversation. Send a message to start chatting!
        </p>
        <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
      </motion.div>
      <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
        {QUICK_REPLIES.map((reply) => (
          <motion.button
            key={reply}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => sendMessage({ text: reply })}
            className="rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-400 transition-colors hover:bg-brand-500/25 hover:text-white"
          >
            {reply}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default NoChatHistoryPlaceholder;
