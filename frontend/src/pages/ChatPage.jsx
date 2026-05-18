import { useChatStore } from "../store/useChatStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";


function ChatPage() {
  const { activeTab, selectedUser } = useChatStore();

  return (
    <div className="border border-transparent animate-border flex overflow-hidden relative w-full h-[99vh]">
      {/* <BorderAnimatedContainer> */}
      {/* LEFT SIDE */}
      <div className="w-80 bg-[#212121] backdrop-blur-sm border-r-2 border-[#757575] flex flex-col">
        <ProfileHeader />
        <ActiveTabSwitch />

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeTab === "chats" ? <ChatsList /> : <ContactList />}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex flex-col bg-[#212121] backdrop-blur-sm">
        {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
      </div>
      {/* </BorderAnimatedContainer> */}
    </div >
  );
}
export default ChatPage;
