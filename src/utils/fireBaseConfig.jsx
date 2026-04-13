// src/Utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getToken, getMessaging, isSupported, onMessage } from "firebase/messaging";

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

let messagingInstancePromise = null;

const getMessagingInstance = async () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }
  if (!("serviceWorker" in navigator)) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!messagingInstancePromise) {
    messagingInstancePromise = Promise.resolve(getMessaging(app));
  }
  return messagingInstancePromise;
};

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

const getFirebaseToken = async () => {
  const messaging = await getMessagingInstance();
  if (!messaging) return "";
  const serviceWorkerRegistration = await getOrRegisterServiceWorker();
  return getToken(messaging, {
    vapidKey:
      "BGM7XIrtDKd1tV47j5fvu_iaJMn3HX-n_zQKTcyF7h1GDNgZszjAs8G-eZSI7mV72ygdmXAKhtJMrLzdThNIagg",
    serviceWorkerRegistration,
  });
};

// const onForegroundMessage = () =>
//   new Promise((resolve) => onMessage(messaging, (payload) => resolve(payload)));

const onForegroundMessage = (callback) => {
  let unsubscribe = () => {};
  getMessagingInstance()
    .then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        callback(payload);
      });
    })
    .catch(() => {});
  return () => unsubscribe();
};


export { auth, googleProvider, getFirebaseToken, onForegroundMessage };
