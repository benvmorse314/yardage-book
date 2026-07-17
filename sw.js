/* Yardage Book service worker.
   Bump VER on every deploy that changes any cached asset. */
'use strict';

const VER = 'yb-v1.2.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'fonts/big-shoulders-display-100-900.woff2',
  'fonts/archivo-100-900.woff2',
  'fonts/ibm-plex-mono-400.woff2',
  'fonts/ibm-plex-mono-600.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // network-first for the app shell: updates land when online, offline still works
    e.respondWith(
      fetch(req)
        .then(res => {
          // never let a 404/500 or captive-portal redirect become the offline shell
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VER).then(c => c.put('./', copy));
          }
          return res;
        })
        .catch(() => caches.match('./').then(r => r || caches.match('index.html')))
    );
    return;
  }

  // static assets: cache-first, backfill on miss
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VER).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
