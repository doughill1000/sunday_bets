// Push + notificationclick handlers, imported into the generated service worker
// via workbox.importScripts (see vite.config.ts). Plain JS — runs in the SW
// global scope, not bundled by Vite.
/* global clients */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Hotshot', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Hotshot';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    icon: '/pwa-192x192.png',
    badge: '/favicon-48x48.png'
  };

  // Coalescing by tag is deliberate (see PushPayload.tag) — repeat alerts for the same
  // subject replace each other instead of stacking. But a replacement is *silent* unless
  // `renotify` is set: no banner, no sound, just an in-place tray update. Every tag we
  // send is a constant for its subject ('test' forever, 'pregame-week-N' for a week), so
  // without this only the first push per tag ever alerted (#814). The two options always
  // travel together — `renotify` without a `tag` is a TypeError, which would sink the
  // notification entirely on the untagged fallback path above.
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(title, options));
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
