import { io } from "socket.io-client";
import Api from "../Services/api";
import {
  extractChatMessagesFromResponse,
  normalizeChatUserId,
} from "./chatUtils";

function isSuccessfulResponse(response) {
  if (!response || response.status >= 400) return false;
  const body = response.data;
  if (body?.success === false) return false;
  if (body?.status === "Failure") return false;
  return true;
}

export async function fetchChatMessages(senderId, receiverId) {
  const userId = normalizeChatUserId(senderId);
  const peerId = normalizeChatUserId(receiverId);
  if (!userId || !peerId) return [];

  try {
    const response = await Api.get("/customer/get_message", {
      params: { userId, receiverId: peerId, page: 1, limit: 200 },
    });

    if (!isSuccessfulResponse(response)) {
      return [];
    }

    return extractChatMessagesFromResponse(response.data).reverse();
  } catch (error) {
    console.error("fetchChatMessages failed:", error);
    return [];
  }
}

export function fetchChatMessagesViaSocket(
  existingSocket,
  senderId,
  receiverId,
  baseUrl,
  timeoutMs = 12000
) {
  const userId = normalizeChatUserId(senderId);
  const peerId = normalizeChatUserId(receiverId);
  if (!userId || !peerId || !baseUrl) {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    let settled = false;
    let socket = existingSocket;
    let ownedSocket = false;

    const finish = (messages) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socket) {
        socket.off("Get_message", onMessages);
        socket.off("connect", onConnect);
      }
      if (ownedSocket && socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      resolve(messages);
    };

    const onMessages = (payload) => {
      const rows = extractChatMessagesFromResponse(payload);
      finish([...rows].reverse());
    };

    const onConnect = () => {
      if (!socket) return;
      socket.emit("new_user_connect", { userid: userId });
      socket.on("Get_message", onMessages);
      socket.emit("get_message", { userId, receiverId: peerId });
    };

    const timer = setTimeout(() => finish([]), timeoutMs);

    if (socket?.connected) {
      onConnect();
      return;
    }

    if (!socket) {
      socket = io(baseUrl, {
        transports: ["websocket", "polling"],
        reconnection: false,
      });
      ownedSocket = true;
    }

    socket.on("connect", onConnect);
    if (!socket.connected) {
      socket.connect();
    }
  });
}

export async function fetchChatHistory(
  senderId,
  receiverId,
  socket,
  baseUrl
) {
  const apiMessages = await fetchChatMessages(senderId, receiverId);
  if (apiMessages.length > 0) {
    return apiMessages;
  }

  return fetchChatMessagesViaSocket(socket, senderId, receiverId, baseUrl);
}
