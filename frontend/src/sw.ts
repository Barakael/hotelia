/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/client" />

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// ─── Activation ──────────────────────────────────────────────────────────────
// Skip the waiting phase and immediately take control of all open pages.
self.skipWaiting();
clientsClaim();

// ─── Precache ─────────────────────────────────────────────────────────────────
// Clean up stale precache entries from older SW versions.
cleanupOutdatedCaches();

// Precache every static asset emitted by the build (list injected at build time).
precacheAndRoute(self.__WB_MANIFEST);

// ─── Runtime: API ─────────────────────────────────────────────────────────────
// Network-first for API calls: always try the network, fall back to cache.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-runtime',
    networkTimeoutSeconds: 10,
  }),
);

// ─── SPA Navigation Fallback ──────────────────────────────────────────────────
// For all HTML navigations (except /api/*) serve index.html from cache so the
// app works fully offline after the first load.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  }),
);

// ─── CRITICAL: Explicit fetch handler for WebAPK eligibility ─────────────────
// Chrome checks HasFetchEventHandler on the SW registration before issuing a
// WebAPK. Workbox's routing above already installs its own listener, but an
// explicit self.addEventListener('fetch') here makes the flag unambiguous and
// guarantees Chrome marks this SW as "fetch-handling" during the installability
// criteria check — the difference between a home-screen shortcut and a true
// WebAPK entry in the app drawer.
self.addEventListener('fetch', () => {
  // All actual request handling is done by the Workbox routes registered above.
  // This explicit listener is intentionally empty — its presence is what matters.
});
