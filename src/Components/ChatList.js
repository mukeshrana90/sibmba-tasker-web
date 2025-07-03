import { useContext, useState } from 'react';
import { ChatContext } from '../context/ChatProvider';
import moment from 'moment';

const ChatList = () => {
  const { chatList, selectedUser, setSelectedUser, setChatList } = useContext(ChatContext);
  const role = localStorage.getItem('role');
  const [searchTerm, setSearchTerm] = useState('');

  const handleChatSelect = (receiverId, chatIndex) => {
    if (selectedUser !== receiverId) {
      setSelectedUser(receiverId);
      localStorage.setItem('reciverID', receiverId);
      // Reset unreadCount for the selected chat
      setChatList((prevChatList) =>
        prevChatList.map((chat, index) =>
          index === chatIndex ? { ...chat, unreadCount: 0 } : chat
        )
      );
      // console.log('ChatList: Selected user:', receiverId, 'Reset unreadCount to 0');
    }
  };

  // Filter chatList based on search term
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
          >
            <path
              d="M7.33333 13.1667C10.2789 13.1667 12.6667 10.7789 12.6667 7.83333C12.6667 4.88781 10.2789 2.5 7.33333 2.5C4.38781 2.5 2 4.88781 2 7.83333C2 10.7789 4.38781 13.1667 7.33333 13.1667Z"
              stroke="#CCCCCC"
              stroke-width="1.33333"
              stroke-linecap="square"
              stroke-linejoin="round"
            />
            <path
              d="M13.9996 14.4996L11.0996 11.5996"
              stroke="#CCCCCC"
              stroke-width="1.33333"
              stroke-linecap="square"
              stroke-linejoin="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search here…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ul>
          {filteredChatList.length > 0 ? (
            filteredChatList.map((ele, index) => {
              const receiverId = role === '2' ? ele?.sender_id : ele?.receiver_id;
              return (
                <li
                  key={index}
                  onClick={() => handleChatSelect(receiverId, chatList.indexOf(ele))}
                  className={selectedUser === receiverId ? 'active' : ''}
                >
                  <div className="d-flex">
                    <div className="chat-list-pro">
                      <img
                        src={
                          ele?.receiver?.profile_image
                            ? `${process.env.REACT_APP_API_URL}${ele?.receiver?.profile_image}`
                            : require('../Assets/Images/my-profile.svg').default
                        }
                        alt="Profile"
                      />
                      <div>
                        <h5>{ele?.receiver?.name}</h5>
                        <p>
                          {ele?.lastMessage?.message?.length > 25
                            ? `${ele?.lastMessage?.message?.substring(0, 25)}...`
                            : ele?.lastMessage?.message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                    <div className="ms-auto  bd-highlight">
                      <p>{moment(ele?.lastMessage?.createdAt).format('h:mm A')}</p>
                      {ele?.unreadCount > 0 && (
                        <span className="unread-count">{ele?.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li>{searchTerm ? 'No matching chats found' : 'No chats available'}</li>
          )}
        </ul>
    </div>
  );
};

export default ChatList;