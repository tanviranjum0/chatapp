import { MessagesSquareIcon } from "lucide-react";
import { motion } from "motion/react";

const NoConversationPlaceholder = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <motion.span
          className="absolute inset-0 rounded-[2rem] bg-brand-500/40 blur-2xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex size-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand-500 to-bloom-500 shadow-glow"
        >
          <MessagesSquareIcon className="size-11 text-white" />
        </motion.div>
      </div>
      <h3 className="text-gradient animate-gradient mb-2 text-2xl font-extrabold">
        Select a conversation
      </h3>
      <p className="max-w-md text-slate-400">
        Choose a contact from the sidebar to start chatting or continue a previous conversation.
      </p>
    </div>
  );
};

export default NoConversationPlaceholder;
