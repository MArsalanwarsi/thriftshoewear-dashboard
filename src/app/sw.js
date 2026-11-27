import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Backend Product, Category, Order & Feature API GET requests -> NetworkFirst with offline cache fallback
    {
      matcher: ({ url, request }) =>
        request.method === "GET" &&
        (url.pathname.startsWith("/api/") || url.hostname.includes("thriftshoewear-backend")),
      handler: new NetworkFirst({
        cacheName: "tsw-admin-api-cache-v1",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    // Product, User Avatar & Media Images -> CacheFirst (up to 150 entries, 7 days)
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new CacheFirst({
        cacheName: "tsw-admin-images-v1",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 150,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
