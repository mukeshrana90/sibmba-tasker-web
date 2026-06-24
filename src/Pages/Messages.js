import { useState } from "react";
import io from "socket.io-client";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import ChatList from "../Components/ChatList";
import MainChat from "../Components/MainChat";
import { ChatProvider, ChatContext } from "../context/ChatProvider";
import { useContext, useEffect } from "react";

const socket = io(`${process.env.REACT_APP_API_URLL}`);

function MessagesContent() {
  const { selectedUser } = useContext(ChatContext);
  const sender_id = localStorage.getItem("userId");
  const reciverID = localStorage.getItem("reciverID");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      setMobileChatOpen(true);
    }
  }, [selectedUser]);

  return (
    <div
      className={`message-chat-contain${
        mobileChatOpen && selectedUser ? " messages-mobile-chat-open" : ""
      }`}
    >
      <ChatList onSelect={() => setMobileChatOpen(true)} />
      <MainChat
        sender_id={sender_id}
        reciverID={reciverID}
        socket={socket}
        onBack={() => setMobileChatOpen(false)}
      />
    </div>
  );
}

export default function Messages() {
  return (
    <ChatProvider>
      <CorporatePageShell
        pageClass="p-messages"
        showBanner={false}
      >
        <div className="messages-page-head">
          <h1>Messages</h1>
          <p>Chat with service providers, customers, and corporate partners.</p>
        </div>
        <MessagesContent />
      </CorporatePageShell>
    </ChatProvider>
  );
}
