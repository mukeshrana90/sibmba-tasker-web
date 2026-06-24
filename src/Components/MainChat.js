import React, { useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ChatContext } from "../context/ChatProvider";
import { Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import defaultImage from "../Assets/Images/placeholder.jpg";
import { setCustomer } from "../Redux/Reducers/LoginSlice";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  handleCategoryImageError,
  taskImageUrl,
  providerDisplayName,
} from "../utils/landingUtils";
import {
  getChatPeerId,
  isMessageForChat,
  normalizeChatMessages,
  normalizeChatUserId,
} from "../utils/chatUtils";
import { fetchChatHistory } from "../utils/chatMessagesApi";

const MainChat = ({ sender_id, reciverID, socket, onBack }) => {
  const BASE_URL = process.env.REACT_APP_API_URLL;
  const token = localStorage.getItem("token");
  const { selectedUser, setSelectedUser, chatList, setNewchat } =
    useContext(ChatContext);
  const [message, setMessage] = useState("");
  const [messageHistory, setMessageHistory] = useState([]);
  const [receiverDetail, setReceiverDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const receiver_id = normalizeChatUserId(selectedUser || reciverID) || null;
  const senderId = normalizeChatUserId(sender_id);
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [packageDetails, setPackageDetails] = useState(null);
  const dispatch = useDispatch();
  const receiverIdRef = useRef(receiver_id);
  const historyRequestRef = useRef(0);

  useEffect(() => {
    receiverIdRef.current = receiver_id;
  }, [receiver_id]);

  useEffect(() => {
    if (!selectedUser && reciverID) {
      setSelectedUser(normalizeChatUserId(reciverID));
    }
  }, [reciverID, selectedUser, setSelectedUser]);

  useEffect(() => {
    const preload = localStorage.getItem("preloadTaskMessage");
    if (preload && socket && receiver_id && senderId) {
      const parsed = JSON.parse(preload);
      socket.emit("send_message_new", {
        sender_id: senderId,
        receiver_id,
        message: JSON.stringify(parsed),
        message_type: "7",
      });
      localStorage.removeItem("preloadTaskMessage");
    }
  }, [receiver_id, socket, senderId]);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messageHistory]);

  useEffect(() => {
    if (receiver_id && socket) {
      socket.emit("joinedRoomUser", {
        sender: senderId,
        reciver: receiver_id,
      });
    }
  }, [receiver_id, senderId, socket]);

  useEffect(() => {
    if (!senderId || !token) return undefined;

    const realtimeSocket = io(BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = realtimeSocket;

    realtimeSocket.on("connect", () => {
      realtimeSocket.emit("new_user_connect", { userid: senderId });
    });

    realtimeSocket.on("receive_message_new", (data) => {
      const incoming = data?.data;
      if (!incoming) return;

      const activeReceiverId = receiverIdRef.current;
      if (!isMessageForChat(incoming, senderId, activeReceiverId)) return;

      const [normalizedMessage] = normalizeChatMessages([incoming]);
      setNewchat((prev) => !prev);
      setMessageHistory((prev) => {
        const exists = prev.some(
          (item) => String(item?._id) === String(normalizedMessage?._id)
        );
        if (exists) return prev;
        return [...prev, normalizedMessage];
      });
    });

    realtimeSocket.on("Get_detailuser", (data) => {
      const requestedId = normalizeChatUserId(receiverIdRef.current);
      const returnedId = normalizeChatUserId(data?.data?._id);
      if (requestedId && returnedId === requestedId) {
        setReceiverDetail(data?.data || null);
      }
    });

    return () => {
      realtimeSocket.removeAllListeners();
      realtimeSocket.disconnect();
      if (socketRef.current === realtimeSocket) {
        socketRef.current = null;
      }
    };
  }, [senderId, token, setNewchat, BASE_URL]);

  useEffect(() => {
    if (!senderId || !token || !receiver_id) {
      setMessageHistory([]);
      setReceiverDetail(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setLoading(true);

    const loadConversation = async () => {
      for (let attempt = 0; attempt < 20 && !socketRef.current; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (cancelled) return;
      }

      const messages = await fetchChatHistory(
        senderId,
        receiver_id,
        socketRef.current,
        BASE_URL
      );

      if (cancelled || historyRequestRef.current !== requestId) return;

      setMessageHistory(messages);
      setLoading(false);

      const detailSocket = socketRef.current;
      if (!detailSocket) return;

      const emitDetail = () => {
        detailSocket.emit("get_detailuser", { user_id: receiver_id });
      };

      if (detailSocket.connected) {
        emitDetail();
      } else {
        detailSocket.once("connect", emitDetail);
      }
    };

    loadConversation();

    return () => {
      cancelled = true;
    };
  }, [senderId, receiver_id, token, BASE_URL]);

  useEffect(() => {
    if (!receiver_id || !senderId || loading || messageHistory.length > 0) {
      return undefined;
    }

    const peerChat = chatList.find(
      (chat) => getChatPeerId(chat, senderId) === receiver_id
    );
    if (!peerChat?.lastMessage?.message) {
      return undefined;
    }

    let cancelled = false;

    const retryHistory = async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (cancelled) return;

      const messages = await fetchChatHistory(
        senderId,
        receiver_id,
        socketRef.current,
        BASE_URL
      );

      if (!cancelled && messages.length > 0) {
        setMessageHistory(messages);
        setLoading(false);
      }
    };

    retryHistory();

    return () => {
      cancelled = true;
    };
  }, [
    BASE_URL,
    chatList,
    loading,
    messageHistory.length,
    receiver_id,
    senderId,
  ]);

  useEffect(() => {
    if (token) {
      getProfileApiCall();
    }
  }, [token]);

  const getProfileApiCall = async () => {
    try {
      const apiRes = await dispatch(
        CustomerActions.getProfileWithSuscription()
      );
      if (apiRes?.payload?.success) {
        dispatch(setCustomer(apiRes?.payload?.data.user));
      }
      setPackageDetails(apiRes?.payload?.data ?? null);
    } catch (error) {
      console.error("Subscription check failed:", error);
    }
  };

  const userRole = Number(packageDetails?.user?.role);
  const isSubscribed = Number(packageDetails?.user?.isSubscribed) === 1;
  const providerNeedsSubscription =
    (userRole === 2 || userRole === 3) && !isSubscribed;
  const canReply =
    userRole === 1 || ((userRole === 2 || userRole === 3) && isSubscribed);

  const sendMessage = () => {
    if (!canReply) {
      setShowPlanModal(true);
      return;
    }

    if (message.trim() === "" || !socketRef.current || !receiver_id) return;

    const payload = {
      sender_id: senderId,
      receiver_id,
      message,
      message_type: 0,
    };
    socketRef.current.emit("send_message_new", payload);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";

    let utcDateString = dateString;
    if (!dateString.includes("T")) {
      utcDateString = dateString.replace(" ", "T") + "Z";
    }

    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) return "-";

    return date
      .toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(/am|pm/, (match) => match.toUpperCase());
  };

  const isOutgoingMessage = (entry) =>
    normalizeChatUserId(entry?.sender_id) === senderId;

  return (
    <div className="message-chat-box">
      <div className="message-chat-name message-box-header">
        <div className="message-header-left">
          {onBack ? (
            <button
              type="button"
              className="messages-back-btn"
              onClick={onBack}
              aria-label="Back to conversations"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null}
          <div>
            <h4>
              {receiverDetail
                ? providerDisplayName(receiverDetail)
                : loading && receiver_id
                  ? "Loading…"
                  : "Select a conversation"}
            </h4>
            <p>{receiverDetail?.email || ""}</p>
          </div>
        </div>
        {receiverDetail ? (
        <div className="d-flex gap-2 message-header-actions">
          <a href={`tel:${receiverDetail?.phone_number}`} className="">
            <svg
              width="30"
              height="31"
              viewBox="0 0 30 31"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M23.7891 2.31641H16.7578C13.3658 2.31641 10.6055 5.0767 10.6055 8.46875C10.6055 11.563 12.9015 14.131 15.8789 14.5585V17.2578C15.8788 17.4316 15.9303 17.6016 16.0268 17.7462C16.1234 17.8907 16.2607 18.0033 16.4214 18.0697C16.7456 18.205 17.1258 18.1325 17.3793 17.8792L20.6374 14.6211H23.7891C27.1811 14.6211 30 11.8608 30 8.46875C30 5.0767 27.1811 2.31641 23.7891 2.31641ZM16.7578 9.34754C16.2723 9.34754 15.8789 8.95402 15.8789 8.46863C15.8789 7.98324 16.2723 7.58973 16.7578 7.58973C17.2432 7.58973 17.6367 7.98324 17.6367 8.46863C17.6367 8.95402 17.2432 9.34754 16.7578 9.34754ZM20.2734 9.34754C19.7879 9.34754 19.3945 8.95402 19.3945 8.46863C19.3945 7.98324 19.7879 7.58973 20.2734 7.58973C20.7588 7.58973 21.1523 7.98324 21.1523 8.46863C21.1523 8.95402 20.7588 9.34754 20.2734 9.34754ZM23.7891 9.34754C23.3036 9.34754 22.9102 8.95402 22.9102 8.46863C22.9102 7.98324 23.3036 7.58973 23.7891 7.58973C24.2745 7.58973 24.668 7.98324 24.668 8.46863C24.668 8.95402 24.2745 9.34754 23.7891 9.34754Z"
                fill="#0f5c4c"
              />
              <path
                d="M19.7461 28.6836C21.2 28.6836 22.3828 27.5008 22.3828 26.0469V22.5312C22.3828 22.1527 22.1408 21.8171 21.782 21.6978L16.5209 19.94C16.2634 19.8533 15.9819 19.8928 15.7553 20.0421L13.5186 21.533C11.1496 20.4035 8.33871 17.5925 7.20914 15.2236L8.7 12.9868C8.77414 12.8754 8.82188 12.7485 8.83958 12.6158C8.85728 12.4831 8.84447 12.3482 8.80213 12.2212L7.04432 6.96014C6.98611 6.78516 6.87428 6.63295 6.72469 6.52512C6.5751 6.41728 6.39534 6.35929 6.21094 6.35938H2.63672C1.18277 6.35938 0 7.52979 0 8.98373C0 19.11 9.6198 28.6836 19.7461 28.6836Z"
                fill="#0f5c4c"
              />
            </svg>
          </a>

          <a
            href={`https://wa.me/${receiverDetail?.phone_number}`}
            target="_blank"
            rel="noreferrer"
          >
            <svg
              width="24"
              height="25"
              viewBox="0 0 24 25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.003 0.5H11.997C5.3805 0.5 0 5.882 0 12.5C0 15.125 0.846 17.558 2.2845 19.5335L0.789 23.9915L5.4015 22.517C7.299 23.774 9.5625 24.5 12.003 24.5C18.6195 24.5 24 19.1165 24 12.5C24 5.8835 18.6195 0.5 12.003 0.5Z"
                fill="#0f5c4c"
              />
              <path
                d="M18.9858 17.4455C18.6963 18.263 17.5473 18.941 16.6308 19.139C16.0038 19.2725 15.1848 19.379 12.4278 18.236C8.90132 16.775 6.63032 13.1915 6.45332 12.959C6.28382 12.7265 5.02832 11.0615 5.02832 9.33953C5.02832 7.61753 5.90282 6.77903 6.25532 6.41903C6.54482 6.12353 7.02332 5.98853 7.48232 5.98853C7.63082 5.98853 7.76432 5.99603 7.88432 6.00203C8.23682 6.01703 8.41382 6.03803 8.64632 6.59453C8.93582 7.29203 9.64082 9.01403 9.72482 9.19103C9.81032 9.36803 9.89582 9.60803 9.77582 9.84053C9.66332 10.0805 9.56432 10.187 9.38732 10.391C9.21032 10.595 9.04232 10.751 8.86532 10.97C8.70332 11.1605 8.52032 11.3645 8.72432 11.717C8.92832 12.062 9.63332 13.2125 10.6713 14.1365C12.0108 15.329 13.0968 15.71 13.4853 15.872C13.7748 15.992 14.1198 15.9635 14.3313 15.7385C14.5998 15.449 14.9313 14.969 15.2688 14.4965C15.5088 14.1575 15.8118 14.1155 16.1298 14.2355C16.4538 14.348 18.1683 15.1955 18.5208 15.371C18.8733 15.548 19.1058 15.632 19.1913 15.7805C19.2753 15.929 19.2753 16.6265 18.9858 17.4455Z"
                fill="#FAFAFA"
              />
            </svg>
          </a>
        </div>
        ) : null}
      </div>
      <div className="message-main-container">
        {loading && receiver_id ? (
          <div className="chat-loader messages-panel-state">
            <div className="spinner" />
            <p>Loading conversation…</p>
          </div>
        ) : Array.isArray(messageHistory) && messageHistory.length > 0 ? (
          <div className="message-main-chat" ref={messageContainerRef}>
            {messageHistory.map((ele, index) => {
              let parsed;
              try {
                parsed = JSON.parse(ele?.message);
              } catch (e) {
                parsed = null;
              }

              const isTaskCard =
                parsed && parsed.image && parsed.name && parsed.price;
              const isImageMessage = ele?.message_type === 1;
              const outgoing = isOutgoingMessage(ele);

              return (
                <div
                  key={ele?._id || `message-${index}`}
                  className={outgoing ? "flow-right-chat" : ""}
                >
                  <div
                    className={outgoing ? "right-side-chat" : "left-side-chat"}
                  >
                    {isTaskCard ? (
                      <div className="task-card-ui">
                        <div className="task-card-header">
                          <img
                            src={`${parsed.image || defaultImage}`}
                            alt="Task"
                          />
                          <div className="task-header-text">
                            <span className="task-label">Product Name</span>
                            <span className="task-title">{parsed.name}</span>
                          </div>
                        </div>

                        <div className="task-header-text">
                          <div>
                            <strong className="task-label">
                              Description:{" "}
                            </strong>
                            <span className="task-title">
                              {parsed.description}
                            </span>
                          </div>
                        </div>
                        <div className="task-header-text">
                          <div>
                            <strong className="task-label">Price: </strong>{" "}
                            <span className="task-title">{parsed.price}</span>
                          </div>

                          <div>
                            <strong className="task-label">🔗 Link: </strong>{" "}
                            <Link
                              className="task-title link"
                              to={`/product-detail/${parsed.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Product
                            </Link>
                          </div>
                        </div>

                        <span className="task-time">
                          {formatDate(ele?.createdAt)}
                        </span>
                      </div>
                    ) : isImageMessage ? (
                      <img
                        src={taskImageUrl(ele?.message)}
                        alt="Chat attachment"
                        onError={handleCategoryImageError}
                        style={{
                          maxWidth: "250px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          height: "200px",
                        }}
                      />
                    ) : (
                      <>
                        <p>{ele?.message}</p>
                        <span className="text-transform">
                          {formatDate(ele?.createdAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="messages-panel-state messages-empty-state">
            <img
              src={require("../Assets/Images/dark-logo.png")}
              alt="Simba Tasker"
            />
            <p>
              {receiver_id
                ? "No messages yet. Say hello to start the conversation."
                : Array.isArray(chatList) && chatList.length > 0
                  ? "Select a conversation from the list to start messaging."
                  : "No conversations yet. Message someone from a booking or profile page."}
            </p>
          </div>
        )}
      </div>

      {receiver_id && (
        <>
          {providerNeedsSubscription && (
            <p className="messages-readonly-note">
              You can read customer messages. Subscribe to a plan to reply.
            </p>
          )}
          <div className="message-chat-input">
            <input
              placeholder={
                providerNeedsSubscription
                  ? "Subscribe to reply to customers"
                  : "Write message here..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || providerNeedsSubscription}
            />
            <button
              onClick={sendMessage}
              disabled={loading || providerNeedsSubscription}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <g clipPath="url(#clip0_3224_27314)">
                  <path
                    d="M0.143157 3.08946C-0.0154793 2.65915 -0.0411072 2.19109 0.0696001 1.74603C0.180307 1.30097 0.422238 0.899464 0.763991 0.593624C1.10298 0.286748 1.52615 0.0885082 1.97891 0.024487C2.43166 -0.0395342 2.89321 0.0336021 3.30399 0.234457L18.379 7.27112C18.7697 7.45146 19.1167 7.71408 19.3965 8.04101C19.6762 8.36793 19.882 8.75144 19.9998 9.16529H3.37316L0.190657 3.19529C0.173134 3.1608 0.157283 3.12548 0.143157 3.08946ZM3.38482 10.8328L0.257324 16.812C0.239945 16.8447 0.224908 16.8787 0.212324 16.9136C0.0543303 17.344 0.0293644 17.812 0.140667 18.2567C0.25197 18.7015 0.494401 19.1025 0.836491 19.4078C1.25758 19.787 1.80399 19.9971 2.37066 19.9978C2.71149 19.9978 3.05316 19.9211 3.37149 19.7653L18.3807 12.7336C18.772 12.5528 19.1195 12.2893 19.3993 11.9613C19.6791 11.6333 19.8846 11.2486 20.0015 10.8336H3.38482V10.8328Z"
                    fill="white"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_3224_27314">
                    <rect width="20" height="20" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </button>
          </div>
        </>
      )}
      <Modal
        show={showPlanModal}
        onHide={() => setShowPlanModal(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body>
          <div className="comman-small-pop">
            <h3>Upgrade Plan</h3>
            <div className="d-flex justify-content-center download-app-section mt-2">
              Please subscribe to our plan to send message
            </div>
            <div className="d-flex justify-content-center mt-3">
              <button
                className="primaryBtn"
                onClick={() => {
                  const role = packageDetails?.user?.role;
                  if (role == 3) {
                    navigate(`/corporate/subscription-plan`);
                  } else {
                    navigate(`/payment`);
                  }
                }}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MainChat;
