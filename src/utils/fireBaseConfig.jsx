// src/Utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getToken, getMessaging, onMessage } from "firebase/messaging";

const firebaseConfig = {
 
  apiKey: "AIzaSyCu-tHnQmiospIM41FqA2GZn17jiip5oXM",
  authDomain: "simbatasker.firebaseapp.com",
  projectId: "simbatasker",
  storageBucket: "simbatasker.firebasestorage.app",
  messagingSenderId: "625243673820",
  appId: "1:625243673820:web:16f8392617389cc696d019"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const messaging = getMessaging(app);

export const getOrRegisterServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    return window.navigator.serviceWorker
      .getRegistration("/firebase-push-notification-scope")
      .then((serviceWorker) => {
        if (serviceWorker) return serviceWorker;
        return window.navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          {
            scope: "/firebase-push-notification-scope",
          }
        );
      });
  }
  throw new Error("The browser doesn`t support service worker.");
};

const getFirebaseToken = () =>
  getOrRegisterServiceWorker().then((serviceWorkerRegistration) =>
    getToken(messaging, {
      vapidKey:
        "BGM7XIrtDKd1tV47j5fvu_iaJMn3HX-n_zQKTcyF7h1GDNgZszjAs8G-eZSI7mV72ygdmXAKhtJMrLzdThNIagg",
      serviceWorkerRegistration,
    })
  );

// const onForegroundMessage = () =>
//   new Promise((resolve) => onMessage(messaging, (payload) => resolve(payload)));

const onForegroundMessage = (callback) => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};


export { auth, googleProvider, getFirebaseToken, onForegroundMessage };
