import { useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RoutesPage from "./routes/Routes";
import { io } from "socket.io-client";
import { onForegroundMessage } from "./utils/fireBaseConfig";
import { getSocketBaseUrl } from "./utils/socketBaseUrl";

function App() {
  const ToastifyNotification = ({ title, body }) => (
    <div className="push-notification">
      <h2 className="push-notification-title">{title}</h2>
      <p className="push-notification-text">{body}</p>
    </div>
  );

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { notification: { title, body } } = payload;
      const toastId = `notification-${payload.messageId}`;

      if (!toast.isActive(toastId)) {
        toast(<ToastifyNotification title={title} body={body} />, {
          toastId,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const BASE_URL = getSocketBaseUrl();
    if (!BASE_URL) return undefined;

    const userId = localStorage.getItem("userId");
    const sock = io(BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    const onConnect = () => {
      if (userId) {
        sock.emit("join_user_channel", { userid: userId });
      }
    };

    sock.on("connect", onConnect);
    sock.on("connect_error", (error) => {
      console.error("Socket connection failed:", error?.message || error);
    });

    sock.on("logistics_notification", (payload) => {
      const data = payload?.data || payload || {};
      const title = data.title || "Logistics update";
      const body = data.message || "";
      const toastId = `logistics-notif-${data._id || data.type || Date.now()}`;
      if (!toast.isActive(toastId)) {
        toast(<ToastifyNotification title={title} body={body} />, { toastId });
      }
      window.dispatchEvent(
        new CustomEvent("simba:logistics_notification", { detail: data })
      );
    });

    return () => {
      sock.off("connect", onConnect);
      sock.removeAllListeners();
      sock.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <ToastContainer
        limit={1}
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <RoutesPage />
    </div>
  );
}

export default App;
