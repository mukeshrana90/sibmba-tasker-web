import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  chatPeerDisplayName,
  getChatPeerId,
  normalizeChatUserId,
} from '../utils/chatUtils';
import {
  getStoredUserId,
  normalizeMongoId,
  persistReceiverId,
} from '../utils/normalizeMongoId';
import { getSocketBaseUrl } from '../utils/socketBaseUrl';
import { resolveActiveModule } from '../utils/Roles';

export const ChatContext = createContext();

// Fire this window event to re-pull the chat list (unread badges), e.g. on a
// foreground FCM chat push.
export const CHAT_REFRESH_EVENT = 'simba:chat_refresh';
const CHAT_LIST_POLL_MS = 60000;

// v2.7.55: every room / message belongs to one module (backend chatModule.js).
// Rooms from older servers have none → treat as Tasker.
export const chatModuleOf = (chatOrMessage) =>
  chatOrMessage?.module === 'logistics' ? 'logistics' : 'tasker';

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

function ensurePeerInList(list, peerId, senderId, hint, module) {
  if (!peerId) return list || [];
  const prev = Array.isArray(list) ? list : [];
  if (
    prev.some(
      (chat) =>
        getChatPeerId(chat, senderId) === peerId &&
        chatModuleOf(chat) === module,
    )
  ) {
    return prev;
  }
  const name = hint?.full_name || hint?.name || 'Conversation';
  return [
    {
      _id: `pending-${module}-${peerId}`,
      module,
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
  const { pathname } = useLocation();
  // Mounted app-wide (routes/Routes.js) so the nav badges work on every page.
  // The selected peer only counts as the "open thread" while on /messages.
  const onMessagesPage = pathname.startsWith('/messages');
  const onMessagesRef = useRef(onMessagesPage);
  onMessagesRef.current = onMessagesPage;
  // Messages list + badges show only the current module's chats
  const currentModule = resolveActiveModule(pathname);
  const moduleRef = useRef(currentModule);
  moduleRef.current = currentModule;
  const seenMessageIds = useRef(new Set());

  const [selectedUser, setSelectedUser] = useState(
    () => normalizeChatUserId(localStorage.getItem('reciverID')) || null
  );
  // Both modules' rooms; `chatList` below is the current module's slice.
  const [allChats, setAllChats] = useState([]);
  const [newchat, setNewchat] = useState(false);
  const selectedUserRef = useRef(selectedUser);
  const chatListRef = useRef(allChats);
  chatListRef.current = allChats;

  const chatList = useMemo(
    () => allChats.filter((chat) => chatModuleOf(chat) === currentModule),
    [allChats, currentModule],
  );
  // Drives the red dot on the other module's switch tab
  const unreadByModule = useMemo(() => {
    const out = { tasker: 0, logistics: 0 };
    for (const chat of allChats)
      out[chatModuleOf(chat)] += chat.unreadCount || 0;
    return out;
  }, [allChats]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const openPeer = () =>
    onMessagesRef.current ? selectedUserRef.current : null;

  const refreshChatList = useCallback(() => {
    if (socket?.connected && sender_id) {
      socket.emit('get_chat_list', { userid: sender_id });
    }
  }, [sender_id]);

  // Server unreadCount (Read_Unread) is the source of truth — re-pull it on
  // navigation, tab focus, chat pushes and a slow poll.
  useEffect(() => {
    refreshChatList();
    if (onMessagesPage) return undefined;
    // Leaving /messages disconnects MainChat's socket, and the backend then
    // marks the user offline with a stale socketId (receive_message_new goes
    // nowhere). Re-register this socket once that disconnect has landed.
    const reclaim = setTimeout(() => {
      if (socket?.connected && sender_id) {
        socket.emit('new_user_connect', { userid: sender_id });
        socket.emit('get_chat_list', { userid: sender_id });
      }
    }, 1000);
    return () => clearTimeout(reclaim);
  }, [pathname, onMessagesPage, refreshChatList, sender_id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'hidden') refreshChatList();
    };
    window.addEventListener('focus', refreshChatList);
    window.addEventListener(CHAT_REFRESH_EVENT, refreshChatList);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(refreshChatList, CHAT_LIST_POLL_MS);
    return () => {
      window.removeEventListener('focus', refreshChatList);
      window.removeEventListener(CHAT_REFRESH_EVENT, refreshChatList);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [refreshChatList]);

  // Peer opened by deep link (?userID=) that may have no room yet: kept as a
  // placeholder row in the module it was opened in. A peer merely remembered
  // in localStorage is never seeded (it may belong to the other module).
  const seedRef = useRef(null);

  useEffect(() => {
    const userID = searchParams.get('userID') || searchParams.get('userId');
    if (!userID) {
      seedRef.current = null;
      // left the deep link without sending → drop its empty placeholder row
      setAllChats((prev) =>
        prev.some((chat) => chat._seeded && !chat.lastMessage?.createdAt)
          ? prev.filter(
              (chat) => !(chat._seeded && !chat.lastMessage?.createdAt),
            )
          : prev,
      );
      return;
    }
    const normalized = normalizeMongoId(userID);
    if (!normalized) return;
    seedRef.current = { peer: normalized, module: moduleRef.current };
    persistReceiverId(normalized);
    setSelectedUser(normalized);
    const hint = readPeerHint(normalized);
    setAllChats((prev) =>
      ensurePeerInList(prev, normalized, sender_id, hint, moduleRef.current),
    );
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
        const activePeer = openPeer();
        const updatedChatList = (data?.getdata || []).map((chat) => ({
          ...chat,
          // open thread is being read (get_message marks it read server-side)
          unreadCount:
            activePeer &&
            getChatPeerId(chat, sender_id) === activePeer &&
            chatModuleOf(chat) === moduleRef.current
              ? 0
              : chat.unreadCount || 0,
        }));
        const seed = seedRef.current;
        const hint = seed ? readPeerHint(seed.peer) : null;
        setAllChats(
          ensurePeerInList(
            updatedChatList,
            seed?.peer,
            sender_id,
            hint,
            seed?.module,
          ),
        );
      });

      socket.on('receive_message_new', (data) => {
        if (!isMounted || !data?.data) return;

        const { sender_id: messageSender, receiver_id: messageReceiver } =
          data.data;
        const normalizedSender = normalizeChatUserId(messageSender);
        const normalizedReceiver = normalizeChatUserId(messageReceiver);
        const isCurrentUserReceiver = normalizedReceiver === sender_id;
        const isCurrentUserSender = normalizedSender === sender_id;

        if (!isCurrentUserReceiver && !isCurrentUserSender) return;

        // The backend emits one message to several targets (sender socket,
        // DM room, receiver socketId) — count it once.
        const msgId = normalizeMongoId(data.data._id);
        if (msgId) {
          if (seenMessageIds.current.has(msgId)) return;
          seenMessageIds.current.add(msgId);
          if (seenMessageIds.current.size > 500) {
            seenMessageIds.current = new Set([msgId]);
          }
        }

        const msgModule = chatModuleOf(data.data);
        // Off /messages the push is suppressed (user is online) — toast it.
        // Other module's messages only light the switch dot (no toast).
        if (
          isCurrentUserReceiver &&
          !onMessagesRef.current &&
          msgModule === moduleRef.current
        ) {
          // receive_message_new only carries user.name — fall back to the list
          const peerChat = chatListRef.current.find(
            (chat) => getChatPeerId(chat, sender_id) === normalizedSender,
          );
          const senderName =
            data.data.sender_name ||
            chatPeerDisplayName(peerChat?.receiver, 'a user');
          const type = Number(data.data.message_type) || 0; // 0 text, 1 image, 7 job card
          const preview =
            type === 0
              ? String(data.data.message || '').slice(0, 120)
              : type === 7
                ? msgModule === 'logistics'
                  ? 'Shared a logistics job'
                  : 'Sent a purchase request'
                : 'Sent you an attachment';
          window.dispatchEvent(
            new CustomEvent('simba:chat_toast', {
              detail: {
                title: `New message from ${senderName}`,
                body: preview || 'Sent you a message',
              },
            }),
          );
        }

        setNewchat((prev) => !prev);
        setAllChats((prevChatList) => {
          const peerId = isCurrentUserReceiver
            ? normalizedSender
            : normalizedReceiver;
          let next = ensurePeerInList(
            prevChatList,
            peerId,
            sender_id,
            null,
            msgModule,
          );
          return next.map((chat) => {
            const chatUserId = getChatPeerId(chat, sender_id);
            const isRelevantChat =
              chatModuleOf(chat) === msgModule &&
              ((isCurrentUserReceiver && chatUserId === normalizedSender) ||
                (isCurrentUserSender && chatUserId === normalizedReceiver));

            if (!isRelevantChat) return chat;

            // open thread = selected peer, on /messages, in this module
            const activePeer =
              msgModule === moduleRef.current ? openPeer() : null;
            const shouldIncrementUnread =
              isCurrentUserReceiver && chatUserId && chatUserId !== activePeer;

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
        // updates the full (both-module) list — match rows by _id
        setChatList: setAllChats,
        currentModule,
        unreadByModule,
        newchat,
        setNewchat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
