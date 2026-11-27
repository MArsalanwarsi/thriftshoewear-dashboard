import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkFirst, NetworkOnly, CacheFirst, ExpirationPlugin } from "serwist";

const SENSITIVE_API_SEGMENTS = [
  "/auth",
  "/logs",
  "/users",
  "/orders",
  "/payments",
  "/upload",
];

const isSensitiveApiPath = (pathname = "") =>
  SENSITIVE_API_SEGMENTS.some((segment) => pathname.includes(segment));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Sensitive auth, PII, audit logs & financial APIs must NEVER be stored in browser CacheStorage
    {
      matcher: ({ url, request }) =>
        (url.pathname.startsWith("/api/") || url.hostname.includes("thriftshoewear-backend")) &&
        (request.method !== "GET" || isSensitiveApiPath(url.pathname)),
      handler: new NetworkOnly(),
    },
    // Non-sensitive Product, Category & Feature Catalog GET requests -> NetworkFirst with offline cache fallback
    {
      matcher: ({ url, request }) =>
        request.method === "GET" &&
        !isSensitiveApiPath(url.pathname) &&
        (url.pathname.startsWith("/api/") || url.hostname.includes("thriftshoewear-backend")),
      handler: new NetworkFirst({
        cacheName: "tsw-admin-catalog-cache-v2",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 80,
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
