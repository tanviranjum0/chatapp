import { useEffect } from "react";
import { motion } from "motion/react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import UserRow from "./UserRow";
import { useAuthStore } from "../store/useAuthStore";
import { stagger } from "../lib/motion";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading, selectedUser } =
    useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <motion.div variants={stagger(0.04)} initial="hidden" animate="show" className="space-y-1">
      {allContacts.map((contact) => (
        <UserRow
          key={contact._id}
          user={contact}
          online={onlineUsers.includes(contact._id)}
          selected={selectedUser?._id === contact._id}
          onSelect={setSelectedUser}
        />
      ))}
    </motion.div>
  );
}
export default ContactList;
