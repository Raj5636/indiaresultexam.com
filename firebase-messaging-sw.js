/* Firebase Messaging Service Worker */
/* Registers background handler for FCM and shows notifications. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Load Firebase (compat for SW convenience)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

async function getFirebaseConfig() {
  try {
    const res = await fetch('/firebase-config.js', { cache: 'no-store' });
    const text = await res.text();
    // Expect window.firebaseConfig = { ... };
    const match = text.match(/firebaseConfig\s*=\s*(\{[\s\S]*?\});/);
    if (match && match[1]) {
      // Safely parse by creating a new Function to return the object
      const cfg = new Function(`return (${match[1]})`)();
      return cfg;
    }
  } catch (e) {
    // ignore and fall through
  }
  return null;
}

(async () => {
  const cfg = await getFirebaseConfig();
  if (!cfg) {
    console.warn('firebase-messaging-sw: Firebase config not found. Background messages disabled.');
    return;
  }
  firebase.initializeApp(cfg);
  const messaging = firebase.messaging();
  // Background messages
  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || 'Notification';
    const options = {
      body: payload?.notification?.body || '',
      icon: payload?.notification?.icon || '/INDIAL.PNG',
      data: payload?.data || {}
    };
    self.registration.showNotification(title, options);
  });
})();
