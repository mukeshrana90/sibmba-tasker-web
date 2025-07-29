importScripts('https://www.gstatic.com/firebasejs/9.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.10.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCu-tHnQmiospIM41FqA2GZn17jiip5oXM",
  authDomain: "simbatasker.firebaseapp.com",
  projectId: "simbatasker",
  storageBucket: "simbatasker.firebasestorage.app",
  messagingSenderId: "625243673820",
  appId: "1:625243673820:web:16f8392617389cc696d019"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png', // Optional: Your app icon
    data: {
      link: payload.data?.link || '/', // 🔗 Link to redirect on click
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Handle Notification Click Event
self.addEventListener('notificationclick', function(event) {
  const link = event.notification.data.link;

  event.notification.close();

  // ✅ Focus if tab is already open or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === link && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
