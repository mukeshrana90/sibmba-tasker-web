import { useState, useContext, useEffect, useLayoutEffect, useRef } from "react";
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
  const containRef = useRef(null);

  // Fit the chat to the screen whatever sits above it (Logistics top bar,
  // approval banner, …): measure its top and hand it to the CSS height calc.
  useLayoutEffect(() => {
    const el = containRef.current;
    if (!el) return undefined;
    const measure = () => {
      let scrolled = window.scrollY || 0;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        scrolled += p.scrollTop || 0;
      }
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top + scrolled));
      // Padding / margins below the chat inside the page, so it ends at the screen edge
      let below = 0;
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const cs = window.getComputedStyle(p);
        below +=
          (parseFloat(cs.paddingBottom) || 0) +
          (parseFloat(cs.borderBottomWidth) || 0) +
          (p === el.parentElement ? 0 : parseFloat(cs.marginBottom) || 0);
      }
      const nextTop = `${top}px`;
      const nextGap = `${Math.round(below)}px`;
      // Only write on a real change: writing resizes <body>, which re-fires the observer
      if (el.style.getPropertyValue("--msg-top") !== nextTop) el.style.setProperty("--msg-top", nextTop);
      if (el.style.getPropertyValue("--msg-gap") !== nextGap) el.style.setProperty("--msg-gap", nextGap);
    };
    measure();
    let frame = 0;
    // Next frame, outside the observer callback (avoids "ResizeObserver loop" errors)
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    window.addEventListener("resize", schedule);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
      ref={containRef}
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
