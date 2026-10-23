import { useState, useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import io from "socket.io-client";
import { useSelector } from "react-redux";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import ChatList from "../Components/ChatList";
import MainChat from "../Components/MainChat";
import { ChatContext } from "../context/ChatProvider";
import { getChatPeerId } from "../utils/chatUtils";
import {
  getStoredUserId,
  normalizeMongoId,
  persistReceiverId,
} from "../utils/normalizeMongoId";
import { getSocketBaseUrl } from "../utils/socketBaseUrl";

const socket = io(getSocketBaseUrl() || undefined);

function MessagesContent() {
  const { selectedUser, setSelectedUser, chatList } = useContext(ChatContext);
  const customerDetails = useSelector((state) => state.login.customerDetails);
  const sender_id = getStoredUserId(customerDetails?._id);
  const [searchParams] = useSearchParams();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const urlPeer =
    normalizeMongoId(
      searchParams.get("userID") || searchParams.get("userId") || ""
    ) || "";

  // Prefer URL (deep link / sidebar navigate), then the remembered selection —
  // but only if that peer has a chat in the current module (chat is
  // module-scoped; a Logistics peer must not open as a blank Tasker thread).
  const rememberedPeer =
    normalizeMongoId(selectedUser) ||
    normalizeMongoId(localStorage.getItem("reciverID")) ||
    "";
  const rememberedInModule =
    !!rememberedPeer &&
    (chatList || []).some(
      (chat) => getChatPeerId(chat, sender_id) === rememberedPeer
    );
  const receiverId = urlPeer || (rememberedInModule ? rememberedPeer : "");

  // Only apply URL → selection when the query param changes (not when user clicks list)
  useEffect(() => {
    if (!urlPeer) return;
    persistReceiverId(urlPeer);
    setSelectedUser((prev) => (prev === urlPeer ? prev : urlPeer));
  }, [urlPeer, setSelectedUser]);

  useEffect(() => {
    if (receiverId) {
      setMobileChatOpen(true);
    }
  }, [receiverId]);

  return (
    <div
      className={`message-chat-contain${
        mobileChatOpen && receiverId ? " messages-mobile-chat-open" : ""
      }`}
    >
      <ChatList onSelect={() => setMobileChatOpen(true)} />
      <MainChat
        sender_id={sender_id}
        reciverID={receiverId}
        socket={socket}
        onBack={() => setMobileChatOpen(false)}
      />
    </div>
  );
}

export default function Messages() {
  return (
    // ChatProvider is mounted app-wide in routes/Routes.js
    <CorporatePageShell pageClass="p-messages" showBanner={false}>
      <div className="messages-page-head">
        <h1>Messages</h1>
        <p>Chat with service providers, customers, and corporate partners.</p>
      </div>
      <MessagesContent />
    </CorporatePageShell>
  );
}
