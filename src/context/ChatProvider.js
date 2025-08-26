import React, { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const ChatContext = createContext();

let socket;

export const ChatProvider = ({ children }) => {
  const BASE_URL = process.env.REACT_APP_API_URLL;
  const sender_id = localStorage.getItem('userId');
  const receiver_id = localStorage.getItem('reciverID');
  const token = localStorage.getItem('token');

  const [selectedUser, setSelectedUser] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [newchat, setNewchat] = useState(false);
  useEffect(() => {
    let isMounted = true;

    if (sender_id && token) {
      socket = io(BASE_URL);

      socket.on('connect', () => {
        console.log('ChatProvider: Socket connected:', socket.id);

        socket.emit('new_user_connect', { userid: sender_id });
        socket.emit('get_chat_list', { userid: sender_id });
      });

      socket.on('Get_chat_list', (data) => {
        if (isMounted) {
          console.log('ChatProvider: Received chat list:', data?.getdata);
          const updatedChatList = (data?.getdata || []).map(chat => ({
            ...chat,
            unreadCount: chat.unreadCount || 0,
          }));
          setChatList(updatedChatList);
        }
      });

      socket.on('receive_message_new', (data) => {
        if (isMounted && data?.data) {
          const { sender_id: messageSender, receiver_id: messageReceiver } = data.data;
          const isCurrentUserReceiver = messageReceiver === sender_id;
          const isCurrentUserSender = messageSender === sender_id;

          if (isCurrentUserReceiver || isCurrentUserSender) {
            setNewchat(!newchat);
            setChatList(prevChatList => {
              return prevChatList.map(chat => {
                const chatUserId = chat.sender_id === sender_id ? chat.receiver_id : chat.sender_id;
                const isRelevantChat =
                  (isCurrentUserReceiver && chatUserId === messageSender) ||
                  (isCurrentUserSender && chatUserId === messageReceiver);

                if (isRelevantChat) {
                  const shouldIncrementUnread = chatUserId !== selectedUser;
                  return {
                    ...chat,
                    lastMessage: data.data,
                    unreadCount: shouldIncrementUnread ? (chat.unreadCount || 0) + 1 : chat.unreadCount,
                  };
                }
                return chat;
              });
            });
          }
        }
      });

      socket.on('connect_error', (err) => {
        console.error('ChatProvider: Socket connection error:', err);
      });
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('Get_chat_list');
        socket.off('receive_message_new');
        socket.disconnect();
      }
    };
  }, [sender_id, receiver_id, token, newchat, selectedUser]);

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