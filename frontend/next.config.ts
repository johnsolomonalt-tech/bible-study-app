import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheStartUrl: true,
  dynamicStartUrl: false,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/bible\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "theologica-bible-passages",
          expiration: {
            maxEntries: 1500,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/bible-api\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "bible-api-cache",
          expiration: {
            maxEntries: 1200,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\/api\/(highlights|tracker|notes)/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "internal-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          networkTimeoutSeconds: 3,
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*(clerk\.accounts\.dev|clerk\.accounts\.com|\.clerk\.).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "clerk-api-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          networkTimeoutSeconds: 3,
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      }
    ],
  },
});

import path from "path";

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://bible-api.com https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/devotional',
        destination: '/api/devotionals',
      },
      {
        source: '/licenses',
        destination: '/legal',
      },
      {
        source: '/license',
        destination: '/legal',
      },
      {
        source: '/canvas',
        destination: '/?tab=canvas',
      },
      {
        source: '/canvas/:path*',
        destination: '/?tab=canvas',
      },
      {
        source: '/board',
        destination: '/?tab=canvas',
      },
      {
        source: '/boards',
        destination: '/?tab=canvas',
      },
      {
        source: '/board/:path*',
        destination: '/?tab=canvas',
      },
      {
        source: '/boards/:path*',
        destination: '/?tab=canvas',
      },
      ...(process.env.DEV_PORTAL_SLUG && process.env.DEV_PORTAL_SLUG !== 'console-7d8f9e6b4a3c21d0' ? [
        {
          source: `/${process.env.DEV_PORTAL_SLUG}`,
          destination: '/console-7d8f9e6b4a3c21d0',
        },
        {
          source: `/${process.env.DEV_PORTAL_SLUG}/:path*`,
          destination: '/console-7d8f9e6b4a3c21d0/:path*',
        },
        {
          source: `/api/${process.env.DEV_PORTAL_SLUG}/:path*`,
          destination: '/api/console-7d8f9e6b4a3c21d0/:path*',
        },
      ] : []),
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
