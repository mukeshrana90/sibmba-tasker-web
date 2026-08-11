// src/utils/fireBaseConfig.jsx
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getToken, getMessaging, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCu-tHnQmiospIM41FqA2GZn17jiip5oXM",
  authDomain: "simbatasker.firebaseapp.com",
  projectId: "simbatasker",
  storageBucket: "simbatasker.firebasestorage.app",
  messagingSenderId: "625243673820",
  appId: "1:625243673820:web:16f8392617389cc696d019",
};

const VAPID_KEY =
  "BGM7XIrtDKd1tV47j5fvu_iaJMn3HX-n_zQKTcyF7h1GDNgZszjAs8G-eZSI7mV72ygdmXAKhtJMrLzdThNIagg";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

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

/** Register Firebase messaging SW at default scope `/` (custom scopes often fail). */
export const getOrRegisterServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  const regs = await navigator.serviceWorker.getRegistrations();
  const existing = regs.find((reg) => {
    const url =
      reg.active?.scriptURL ||
      reg.waiting?.scriptURL ||
      reg.installing?.scriptURL ||
      "";
    return url.includes("firebase-messaging-sw.js");
  });
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );
  await navigator.serviceWorker.ready;
  return registration;
};

/**
 * @returns {{ token: string, reason: string }}
 */
export const getFirebaseTokenWithMeta = async () => {
  try {
    if (typeof window === "undefined") {
      return { token: "", reason: "window_unavailable" };
    }
    if (typeof Notification === "undefined") {
      return { token: "", reason: "notifications_api_unavailable" };
    }
    if (!window.isSecureContext) {
      return {
        token: "",
        reason:
          "insecure_context_use_https_or_localhost",
      };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      return { token: "", reason: "firebase_messaging_unsupported" };
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { token: "", reason: `notification_permission_${permission}` };
    }

    const serviceWorkerRegistration = await getOrRegisterServiceWorker();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration,
    });

    if (!token) {
      return { token: "", reason: "empty_fcm_token" };
    }
    return { token, reason: "" };
  } catch (error) {
    console.error("Firebase getToken failed:", error);
    return {
      token: "",
      reason: error?.message || "get_token_threw",
    };
  }
};

const getFirebaseToken = async () => {
  const { token } = await getFirebaseTokenWithMeta();
  return token || "";
};

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

export {
  auth,
  googleProvider,
  appleProvider,
  getFirebaseToken,
  onForegroundMessage,
};
