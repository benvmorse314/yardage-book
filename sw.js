/* Yardage Book service worker.
   Bump VER on every deploy that changes any cached asset, and keep it equal to
   APP_VER in index.html - that is the build number shown in the app. */
'use strict';

const VER = 'yb-v1.10.1';
/* This origin is shared with Ground Force, and Cache Storage is per ORIGIN, not per
   worker scope. Only ever touch caches that carry our own prefix. */
const PREFIX = 'yb-';
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
  /* cache:'reload' always goes to the network. GitHub Pages serves max-age=600, so
     a plain addAll() can store a ten-minute-stale index.html as the offline shell -
     and that stale shell is what a flaky connection then falls back to. */
  e.waitUntil(
    caches.open(VER)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      const old = keys.filter(k => k.indexOf(PREFIX) === 0 && k !== VER);
      return Promise.all(old.map(k => caches.delete(k)))
        .then(() => self.clients.claim())
        .then(() => old.length ? self.clients.matchAll({ type: 'window' }) : [])
        .then(list => {
          /* An UPDATE (an older cache of ours existed): every open window is still
             running the previous build. Reload it now - a home-screen app has no
             reload button, so otherwise the new build waits for a force-quit.
             The page flushes its pending save on pagehide before it goes. */
          for (const c of list) {
            try {
              const p = c.navigate(c.url);
              if (p && p.catch) p.catch(() => {});
            } catch (err) {}
          }
        });
    })
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    /* Network-first for the app shell, and never through the HTTP cache: with
       max-age=600 a plain fetch(req) can hand back the previous build for ten
       minutes after a deploy. no-store always asks the server; offline still
       falls back to the cached shell. */
    e.respondWith(
      fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
        .then(res => {
          // never let a 404/500 or captive-portal redirect become the offline shell
          if (res.ok && res.type === 'basic' && !res.redirected) {
            const copy = res.clone();
            caches.open(VER).then(c => c.put('./', copy));
          }
          // a followed redirect cannot answer a navigation - hand back a clean copy
          return res.redirected
            ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers })
            : res;
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
