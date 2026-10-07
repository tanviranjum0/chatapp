import { useEffect } from "react";
import { motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import UserRow from "./UserRow";
import { useAuthStore } from "../store/useAuthStore";
import { stagger } from "../lib/motion";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser, selectedUser } =
    useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="space-y-1">
      {chats.map((chat) => (
        <UserRow
          key={chat._id}
          user={chat}
          online={onlineUsers.includes(chat._id)}
          selected={selectedUser?._id === chat._id}
          onSelect={setSelectedUser}
        />
      ))}
    </motion.div>
  );
}
export default ChatsList;
