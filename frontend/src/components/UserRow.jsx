import { memo } from "react";
import { motion } from "motion/react";
import Avatar from "./Avatar";
import { fadeUp } from "../lib/motion";

// One clickable person in the chats / contacts lists.
const UserRow = memo(function UserRow({ user, online, selected, onSelect }) {
  return (
    <motion.button
      variants={fadeUp}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(user)}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
        selected
          ? "border-brand-500/50 bg-brand-500/15"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.06]"
      }`}
    >
      <Avatar src={user.profilePic} alt={user.fullName} online={online} />
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold text-slate-100">{user.fullName}</h4>
        <p className={`text-xs ${online ? "text-emerald-400" : "text-slate-500"}`}>
          {online ? "Online" : "Offline"}
        </p>
      </div>
    </motion.button>
  );
});
export default UserRow;
