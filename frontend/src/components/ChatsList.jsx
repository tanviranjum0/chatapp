import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import UserRow from "./UserRow";

function ChatsList() {
  const chats = useChatStore((s) => s.chats);
  const chatsLoaded = useChatStore((s) => s.chatsLoaded);
  const isUsersLoading = useChatStore((s) => s.isUsersLoading);
  const selectedId = useChatStore((s) => s.selectedUser?._id);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const fetchChats = useChatStore((s) => s.fetchChats);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const meId = useAuthStore((s) => s.authUser._id);

  // rows present on first paint appear instantly; rows that arrive later slide in
  const initialIds = useRef(null);
  if (chatsLoaded && initialIds.current === null) initialIds.current = new Set(chats.map((c) => c._id));

  useEffect(() => {
    // silent when we already have rows: coming back to this tab never flashes a skeleton
    fetchChats({ silent: useChatStore.getState().chatsLoaded });
  }, [fetchChats]);

  if (!chatsLoaded || isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <ul className="space-y-1" aria-label="Conversations">
      <AnimatePresence initial={false}>
        {chats.map((chat) => (
          <motion.li
            key={chat._id}
            layout="position"
            initial={initialIds.current?.has(chat._id) ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.7 }}
          >
            <UserRow
              user={chat}
              meId={meId}
              online={onlineUsers.includes(chat._id)}
              selected={selectedId === chat._id}
              onSelect={setSelectedUser}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
export default ChatsList;
