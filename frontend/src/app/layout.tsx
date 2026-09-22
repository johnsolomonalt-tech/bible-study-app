import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Theologica Study Workspace",
  description: "Bible app with AI chat and notes",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-dark.png",
    apple: "/logo-dark.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Theologica",
  },
  applicationName: "Theologica",
};

import type { Viewport } from 'next';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#141413',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link id="dynamic-favicon" rel="icon" href="/logo-dark.png" type="image/png" />
        <link id="dynamic-apple-icon" rel="apple-touch-icon" href="/logo-dark.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let themeMatch = document.cookie.match(/(^|;)\s*theme=([^;]+)/);
                let theme = themeMatch ? decodeURIComponent(themeMatch[2]) : localStorage.getItem('theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
                var iconPath = theme === 'light' ? '/logo-light.png' : '/logo-dark.png';
                var fav = document.getElementById('dynamic-favicon') || document.querySelector("link[rel~='icon']");
                if (fav) fav.href = iconPath;
                var appleFav = document.getElementById('dynamic-apple-icon') || document.querySelector("link[rel~='apple-touch-icon']");
                if (appleFav) appleFav.href = iconPath;

                // Evict obsolete PWA service worker and clear stale cache if on localhost/dev or if old hashes exist
                if ('serviceWorker' in navigator && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var r of regs) {
                      r.unregister();
                    }
                  }).catch(function() {});
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      for (var k of keys) {
                        if (k.indexOf('workbox') !== -1 || k.indexOf('pages') !== -1 || k.indexOf('next-') !== -1) {
                          caches.delete(k);
                        }
                      }
                    }).catch(function() {});
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${merriweather.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
