import React, { createContext, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getChatPeerId, normalizeChatUserId } from '../utils/chatUtils';

export const ChatContext = createContext();

let socket;

export const ChatProvider = ({ children }) => {
  const BASE_URL = process.env.REACT_APP_API_URLL;
  const sender_id = normalizeChatUserId(localStorage.getItem('userId'));
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
    const userID = searchParams.get('userID');
    if (userID) {
      const normalized = normalizeChatUserId(userID);
      localStorage.setItem('reciverID', normalized);
      setSelectedUser(normalized);
    }
  }, [searchParams]);

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
        if (isMounted) {
          const updatedChatList = (data?.getdata || []).map((chat) => ({
            ...chat,
            unreadCount: chat.unreadCount || 0,
          }));
          setChatList(updatedChatList);
        }
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
        setChatList((prevChatList) =>
          prevChatList.map((chat) => {
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
          })
        );
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
