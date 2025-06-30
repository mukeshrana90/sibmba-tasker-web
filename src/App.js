import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RoutesPage from "./routes/Routes";
import { io } from 'socket.io-client';
import { onForegroundMessage } from "./utils/fireBaseConfig";

function App() {
  const [locationHandled, setLocationHandled] = useState(false);

  useEffect(() => {
    const existingLat = localStorage.getItem("latitude");
    const existingLng = localStorage.getItem("longitude");
  
    if (existingLat && existingLng) {
      console.log("Location already stored:", existingLat, existingLng);
      setLocationHandled(true); // ✅ Mark as handled if already available
      return;
    }
  
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          localStorage.setItem("latitude", lat);
          localStorage.setItem("longitude", lng);
          console.log("Location saved:", lat, lng);
          setLocationHandled(true); // ✅ Location access handled (granted)
        },
        error => {
          console.error("Error getting location:", error);
          setLocationHandled(true); // ✅ Location access handled (denied or error)
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setLocationHandled(true); // ✅ Fallback if not supported
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
      console.log("Received foreground message: ", payload);
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
    const token = localStorage.getItem("token");
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
