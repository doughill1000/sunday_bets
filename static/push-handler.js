// Push + notificationclick handlers, imported into the generated service worker
// via workbox.importScripts (see vite.config.ts). Plain JS — runs in the SW
// global scope, not bundled by Vite.
/* global self, clients */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Sunday Bets', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Sunday Bets';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/' },
      icon: '/pwa-192x192.png',
      badge: '/favicon-48x48.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
      return undefined;
    })
  );
});
