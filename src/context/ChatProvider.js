import React, { createContext, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { getChatPeerId, normalizeChatUserId } from '../utils/chatUtils';
import {
  getStoredUserId,
  normalizeMongoId,
  persistReceiverId,
} from '../utils/normalizeMongoId';
import { getSocketBaseUrl } from '../utils/socketBaseUrl';

export const ChatContext = createContext();

let socket;

function readPeerHint(peerId) {
  try {
    const raw = sessionStorage.getItem('chatPeerHint');
    if (!raw) return null;
    const hint = JSON.parse(raw);
    if (normalizeMongoId(hint?._id) !== peerId) return null;
    return hint;
  } catch {
    return null;
  }
}

function ensurePeerInList(list, peerId, senderId, hint) {
  if (!peerId) return list || [];
  const prev = Array.isArray(list) ? list : [];
  if (prev.some((chat) => getChatPeerId(chat, senderId) === peerId)) {
    return prev;
  }
  const name = hint?.full_name || hint?.name || 'Conversation';
  return [
    {
      _id: `pending-${peerId}`,
      sender_id: senderId,
      receiver_id: peerId,
      lastMessage: { message: '', createdAt: null, message_type: '' },
      receiver: {
        name,
        full_name: name,
        email: hint?.email || '',
        company_name: hint?.company_name || '',
        profile_image: hint?.profile_image || '',
      },
      unreadCount: 0,
      _seeded: true,
    },
    ...prev,
  ];
}

export const ChatProvider = ({ children }) => {
  const BASE_URL = getSocketBaseUrl();
  const customerDetails = useSelector((state) => state.login.customerDetails);
  const sender_id = getStoredUserId(customerDetails?._id);
  const token = localStorage.getItem('token');
  const [searchParams] = useSearchParams();

  const [selectedUser, setSelectedUser] = useState(
    () => normalizeChatUserId(localStorage.getItem('reciverID')) || null
  );
  const [chatList, setChatList] = useState([]);
  const [newchat, setNewchat] = useState(false);
  const selectedUserRef = useRef(selectedUser);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    const userID = searchParams.get('userID') || searchParams.get('userId');
    if (!userID) return;
    const normalized = normalizeMongoId(userID);
    if (!normalized) return;
    persistReceiverId(normalized);
    setSelectedUser(normalized);
    const hint = readPeerHint(normalized);
    setChatList((prev) => ensurePeerInList(prev, normalized, sender_id, hint));
  }, [searchParams, sender_id]);

  useEffect(() => {
    let isMounted = true;

    if (sender_id && token) {
      socket = io(BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socket.on('connect', () => {
        socket.emit('new_user_connect', { userid: sender_id });
        socket.emit('get_chat_list', { userid: sender_id });
      });

      socket.on('Get_chat_list', (data) => {
        if (!isMounted) return;
        const updatedChatList = (data?.getdata || []).map((chat) => ({
          ...chat,
          unreadCount: chat.unreadCount || 0,
        }));
        const activePeer = selectedUserRef.current;
        const hint = activePeer ? readPeerHint(activePeer) : null;
        setChatList(
          ensurePeerInList(updatedChatList, activePeer, sender_id, hint)
        );
      });

      socket.on('receive_message_new', (data) => {
        if (!isMounted || !data?.data) return;

        const { sender_id: messageSender, receiver_id: messageReceiver } = data.data;
        const normalizedSender = normalizeChatUserId(messageSender);
        const normalizedReceiver = normalizeChatUserId(messageReceiver);
        const isCurrentUserReceiver = normalizedReceiver === sender_id;
        const isCurrentUserSender = normalizedSender === sender_id;

        if (!isCurrentUserReceiver && !isCurrentUserSender) return;

        setNewchat((prev) => !prev);
        setChatList((prevChatList) => {
          const peerId = isCurrentUserReceiver
            ? normalizedSender
            : normalizedReceiver;
          let next = ensurePeerInList(prevChatList, peerId, sender_id, null);
          return next.map((chat) => {
            const chatUserId = getChatPeerId(chat, sender_id);
            const isRelevantChat =
              (isCurrentUserReceiver && chatUserId === normalizedSender) ||
              (isCurrentUserSender && chatUserId === normalizedReceiver);

            if (!isRelevantChat) return chat;

            const activePeer = selectedUserRef.current;
            const shouldIncrementUnread =
              chatUserId && chatUserId !== activePeer;

            return {
              ...chat,
              lastMessage: data.data,
              unreadCount: shouldIncrementUnread
                ? (chat.unreadCount || 0) + 1
                : chat.unreadCount,
            };
          });
        });
      });

      socket.on('connect_error', (err) => {
        console.error('ChatProvider: Socket connection error:', err);
      });
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }
    };
  }, [sender_id, token, BASE_URL]);

  return (
    <ChatContext.Provider
      value={{
        selectedUser,
        setSelectedUser,
        chatList,
        setChatList,
        newchat,
        setNewchat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
