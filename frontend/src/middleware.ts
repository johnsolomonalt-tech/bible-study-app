import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DEV_PORTAL_SLUG } from "@/lib/devConfig";

const isDevRoute = createRouteMatcher([
  `/${DEV_PORTAL_SLUG}(.*)`,
  `/api/${DEV_PORTAL_SLUG}(.*)`,
  '/dev(.*)',
  '/api/dev(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isDevRoute(req)) {
    const targetSlug = DEV_PORTAL_SLUG || 'console-7d8f9e6b4a3c21d0';

    // 1. Alias /dev to the obfuscated developer portal slug so Solomon can directly visit /dev
    if (req.nextUrl.pathname === '/dev' || req.nextUrl.pathname.startsWith('/dev/')) {
      const newPath = req.nextUrl.pathname.replace(/^\/dev/, `/${targetSlug}`);
      return NextResponse.redirect(new URL(newPath, req.url));
    }
    if (req.nextUrl.pathname.startsWith('/api/dev')) {
      const newPath = req.nextUrl.pathname.replace(/^\/api\/dev/, `/api/${targetSlug}`);
      return NextResponse.rewrite(new URL(newPath, req.url));
    }

    const { userId } = await auth();

    // 2. Reject unauthenticated requests to the developer API routes
    if (req.nextUrl.pathname.startsWith(`/api/${targetSlug}`)) {
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized. Sign in required.' }, { status: 401 });
      }
    }

    // 3. For page navigation, pass through to layout.tsx which performs full server-side
    // Clerk user verification, database admin checks, and renders the passcode lock screen.
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
