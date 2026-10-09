import { useEffect, useRef } from "react";
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

  // One live notification toast at a time. A burst (several events within a
  // few seconds, e.g. document reminders) collapses into one "N new
  // notifications" toast instead of a long chain that keeps covering the
  // header bell / profile buttons. Push + socket copies of the same event
  // are shown once.
  const burst = useRef({ count: 0, last: 0, seen: new Map() });
  const showNotificationToast = (title, body) => {
    const now = Date.now();
    const b = burst.current;
    const key = `${title}|${body}`;
    for (const [k, t] of b.seen) if (now - t > 10000) b.seen.delete(k);
    if (b.seen.has(key)) return; // same event via push and socket
    b.seen.set(key, now);
    const TOAST_ID = "live-notification";
    const inBurst = toast.isActive(TOAST_ID) && now - b.last < 6000;
    b.count = inBurst ? b.count + 1 : 1;
    b.last = now;
    const content =
      b.count > 1 ? (
        <ToastifyNotification
          title={`${b.count} new notifications`}
          body={`Latest: ${title}. Open the bell to see them all.`}
        />
      ) : (
        <ToastifyNotification title={title} body={body} />
      );
    if (toast.isActive(TOAST_ID)) {
      toast.update(TOAST_ID, { render: content, autoClose: 4000 });
    } else {
      toast(content, { toastId: TOAST_ID, autoClose: 4000, pauseOnHover: false });
    }
  };

  // Phones: keep the focused field visible above the on-screen keyboard
  // (client review: keyboard covered fields on sign-up / add asset).
  useEffect(() => {
    const onFocusIn = (e) => {
      const el = e.target;
      if (!el?.matches?.("input, textarea, select") || window.innerWidth > 820) return;
      setTimeout(() => {
        const vv = window.visualViewport;
        const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
        const r = el.getBoundingClientRect();
        if (r.bottom > visibleBottom - 12 || r.top < 60) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 300);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  // Opening a header menu (bell / profile / icon buttons) closes any toast so
  // it never covers the menu the user is trying to use.
  useEffect(() => {
    const onPointer = (e) => {
      const t = e.target;
      if (t?.closest?.(".avatar-btn, .icon-btn, .notify-wrap > button, .avatar-wrap > button")) {
        // Drop queued toasts too (limit=1 queues them), else the next one
        // pops up right over the menu that just opened
        toast.clearWaitingQueue();
        toast.dismiss();
      }
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, []);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { notification: { title, body } } = payload;
      showNotificationToast(title, body);
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
      showNotificationToast(title, body);
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
