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
  weight: ["400", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theologica.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Theologica Study Workspace",
    template: "%s | Theologica",
  },
  description: "An advanced, reverent visual Scripture study workspace featuring interactive interlinear lexicons, theological AI assistance, and inductive mind-mapping.",
  keywords: ["Bible study", "Scripture", "Theology", "Interlinear", "Hebrew Greek Lexicon", "Christian", "Study notes", "Mind map"],
  authors: [{ name: "Theologica" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-dark.png",
    apple: "/logo-dark.png",
  },
  openGraph: {
    title: "Theologica Study Workspace",
    description: "Visual Scripture study workspace with inductive canvas, Greek/Hebrew interlinear, and theological AI.",
    url: siteUrl,
    siteName: "Theologica",
    locale: "en_US",
    type: "website",
    images: [{ url: "/logo-dark.png", width: 512, height: 512, alt: "Theologica Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Theologica Study Workspace",
    description: "Visual Scripture study workspace with inductive canvas, Greek/Hebrew interlinear, and theological AI.",
    images: ["/logo-dark.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Theologica",
  },
  applicationName: "Theologica",
};

import type { Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#141413',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
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
                } else if (theme === 'sepia') {
                  document.documentElement.setAttribute('data-theme', 'sepia');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
                var accentMatch = document.cookie.match(/(^|;)\s*theologica_accent_color=([^;]+)/);
                var accent = accentMatch ? decodeURIComponent(accentMatch[2]) : localStorage.getItem('theologica_accent_color');
                if (accent) {
                  document.documentElement.style.setProperty('--accent', accent);
                }
                var iconPath = (theme === 'light' || theme === 'sepia') ? '/logo-light.png' : '/logo-dark.png';
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
    </ClerkProvider>
  );
}
