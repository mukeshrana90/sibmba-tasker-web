export function normalizeChatUserId(id) {
  if (id == null) return "";
  if (typeof id === "object" && id._id != null) return String(id._id);
  return String(id);
}

export function getChatPeerId(chat, currentUserId) {
  if (!chat || !currentUserId) return null;
  const me = normalizeChatUserId(currentUserId);
  if (normalizeChatUserId(chat.sender_id) === me) {
    return normalizeChatUserId(chat.receiver_id) || null;
  }
  if (normalizeChatUserId(chat.receiver_id) === me) {
    return normalizeChatUserId(chat.sender_id) || null;
  }
  return (
    normalizeChatUserId(chat.receiver_id) ||
    normalizeChatUserId(chat.sender_id) ||
    null
  );
}

export function normalizeChatMessages(payload) {
  const rows = extractChatMessageRows(payload);
  return rows.map((message) => ({
    ...message,
    sender_id: normalizeChatUserId(message?.sender_id),
    receiver_id: normalizeChatUserId(message?.receiver_id),
  }));
}

export function extractChatMessageRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.getdata)) return payload.getdata;
  return [];
}

export function extractChatMessagesFromResponse(body) {
  return normalizeChatMessages(body);
}

export function isMessageForChat(message, senderId, receiverId) {
  if (!message) return false;
  const me = normalizeChatUserId(senderId);
  const peer = normalizeChatUserId(receiverId);
  const messageSender = normalizeChatUserId(message.sender_id);
  const messageReceiver = normalizeChatUserId(message.receiver_id);
  return (
    (messageSender === peer && messageReceiver === me) ||
    (messageSender === me && messageReceiver === peer)
  );
}

export function getLastMessagePreview(lastMessage) {
  if (!lastMessage) return "No messages yet";
  if (lastMessage.message_type === 1) return "Image";
  const text = String(lastMessage.message || "").trim();
  if (!text) return "No messages yet";
  return text.length > 25 ? `${text.slice(0, 25)}...` : text;
}
