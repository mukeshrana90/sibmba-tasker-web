import { useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import { ChatContext } from '../context/ChatProvider';
import moment from 'moment';
import {
  handleUserImageError,
  userImageUrl,
  formatDisplayTitle,
} from '../utils/landingUtils';
import { getChatPeerId, getLastMessagePreview, normalizeChatUserId } from '../utils/chatUtils';
import { getStoredUserId } from '../utils/normalizeMongoId';

const ChatList = ({ onSelect }) => {
  const { chatList, selectedUser, setSelectedUser, setChatList } = useContext(ChatContext);
  const customerDetails = useSelector((state) => state.login.customerDetails);
  const currentUserId = getStoredUserId(customerDetails?._id);
  const [searchTerm, setSearchTerm] = useState('');

  const handleChatSelect = (peerId, chatIndex) => {
    const normalizedPeerId = normalizeChatUserId(peerId);
    if (!normalizedPeerId) return;
    if (selectedUser !== normalizedPeerId) {
      setSelectedUser(normalizedPeerId);
      localStorage.setItem('reciverID', normalizedPeerId);
      setChatList((prevChatList) =>
        prevChatList.map((chat, index) =>
          index === chatIndex ? { ...chat, unreadCount: 0 } : chat
        )
      );
    }
    onSelect?.();
  };

  const filteredChatList = Array.isArray(chatList)
    ? chatList.filter((ele) =>
        ele?.receiver?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="message-chat-list">
      <div className="chat-search">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="17"
          viewBox="0 0 16 17"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.33333 13.1667C10.2789 13.1667 12.6667 10.7789 12.6667 7.83333C12.6667 4.88781 10.2789 2.5 7.33333 2.5C4.38781 2.5 2 4.88781 2 7.83333C2 10.7789 4.38781 13.1667 7.33333 13.1667Z"
            stroke="#CCCCCC"
            strokeWidth="1.33333"
            strokeLinecap="square"
            strokeLinejoin="round"
          />
          <path
            d="M13.9996 14.4996L11.0996 11.5996"
            stroke="#CCCCCC"
            strokeWidth="1.33333"
            strokeLinecap="square"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Search conversations…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search conversations"
        />
      </div>
      <ul>
        {filteredChatList.length > 0 ? (
          filteredChatList.map((ele, index) => {
            const peerId = getChatPeerId(ele, currentUserId);
            const chatIndex = chatList.indexOf(ele);
            const isActive = selectedUser && peerId && String(selectedUser) === String(peerId);
            const createdAt = ele?.lastMessage?.createdAt;
            const timeLabel =
              createdAt && moment(createdAt).isValid()
                ? moment(createdAt).format('h:mm A')
                : '';

            return (
              <li
                key={peerId || ele?._id || `chat-${index}`}
                onClick={() => handleChatSelect(peerId, chatIndex)}
                className={isActive ? 'active' : ''}
              >
                <div className="d-flex align-items-start">
                  <div className="chat-list-pro">
                    <img
                      src={
                        ele?.receiver?.profile_image
                          ? userImageUrl(ele?.receiver)
                          : require('../Assets/Images/my-profile.svg').default
                      }
                      alt=""
                      onError={handleUserImageError}
                    />
                    <div>
                      <h5>{formatDisplayTitle(ele?.receiver?.name, 'User')}</h5>
                      <p>{getLastMessagePreview(ele?.lastMessage)}</p>
                    </div>
                  </div>
                  <div className="ms-auto chat-list-meta">
                    {timeLabel ? <p>{timeLabel}</p> : null}
                    {ele?.unreadCount > 0 ? (
                      <span className="unread-count">{ele.unreadCount}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })
        ) : (
          <li className="messages-list-empty">
            {searchTerm ? 'No matching chats found' : 'No chats available'}
          </li>
        )}
      </ul>
    </div>
  );
};

export default ChatList;
