import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  adjustFontFallback: false,
});

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://theologica-gamma.vercel.app'
).replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
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
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Theologica Study Workspace",
    description: "Visual Scripture study workspace with inductive canvas, Greek/Hebrew interlinear, and theological AI.",
    url: siteUrl,
    siteName: "Theologica",
    locale: "en_US",
    type: "website",
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "Theologica Study Workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theologica Study Workspace",
    description: "Visual Scripture study workspace with inductive canvas, Greek/Hebrew interlinear, and theological AI.",
    images: [`${siteUrl}/og-image.png`],
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

import { theologicaClerkAppearance } from '@/lib/clerkTheme';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#141413',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={theologicaClerkAppearance}
    >
      <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Theologica" />
        <link id="dynamic-favicon" rel="icon" href="/logo-dark.png" type="image/png" />
        <link id="dynamic-apple-icon" rel="apple-touch-icon" href="/apple-touch-icon.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let themeMatch = document.cookie.match(/(^|;)\\s*theme=([^;]+)/);
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
                var accentMatch = document.cookie.match(/(^|;)\\s*theologica_accent_color=([^;]+)/);
                var accent = accentMatch ? decodeURIComponent(accentMatch[2]) : localStorage.getItem('theologica_accent_color');
                if (accent) {
                  document.documentElement.style.setProperty('--accent', accent);
                }
                var iconPath = (theme === 'light' || theme === 'sepia') ? '/logo-light.png' : '/logo-dark.png';
                var fav = document.getElementById('dynamic-favicon') || document.querySelector("link[rel~='icon']");
                if (fav) fav.href = iconPath;

                // Register PWA Service Worker
                if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                      .then(function(reg) {
                        reg.onupdatefound = function() {
                          var installingWorker = reg.installing;
                          if (installingWorker) {
                            installingWorker.onstatechange = function() {
                              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[Theologica] New version available.');
                              }
                            };
                          }
                        };
                      })
                      .catch(function(err) {
                        console.warn('[Theologica] SW registration failed:', err);
                      });
                  });
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
