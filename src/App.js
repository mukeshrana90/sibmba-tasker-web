import { useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RoutesPage from "./routes/Routes";
import { io } from 'socket.io-client';
import { onForegroundMessage } from "./utils/fireBaseConfig";

function App() {
  useEffect(() => {
    const path = window.location.pathname;
    const existingLat = localStorage.getItem("latitude");
    const existingLng = localStorage.getItem("longitude");
     if (path.includes("terms-and-conditions") || path.includes("privacy-policy")) {
      return;
    }
    if (existingLat && existingLng) {
      return;
    }
  
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          localStorage.setItem("latitude", lat);
          localStorage.setItem("longitude", lng);
        },
        error => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

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
      unsubscribe(); // Cleanup the listener when the component unmounts
    };
  }, []);


  useEffect(() => {
    const BASE_URL = process.env.REACT_APP_API_URLL;

    const initializeSocket = async () => {
      try {
        await io(BASE_URL);
        console.log("Socket connected");
      } catch (error) {
        console.error("Socket connection failed:", error);
      }
    };

    initializeSocket();
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
