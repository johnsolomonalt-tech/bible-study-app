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
    // Probing legacy /dev routes returns 404 without redirect or information disclosure
    if (req.nextUrl.pathname.startsWith('/dev') || req.nextUrl.pathname.startsWith('/api/dev')) {
      return new NextResponse(null, { status: 404 });
    }

    const { userId, sessionClaims } = await auth();

    // 1. Gate: Must be an authenticated Clerk session
    if (!userId) {
      if (req.nextUrl.pathname.startsWith(`/api/${DEV_PORTAL_SLUG}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }

    // 2. Strict Admin Identity Gate via Environment Variables
    const allowedUserIds = (process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const allowedEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // In production, require explicit admin config; block all dev console access if none configured
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && allowedUserIds.length === 0 && allowedEmails.length === 0) {
      if (req.nextUrl.pathname.startsWith(`/api/${DEV_PORTAL_SLUG}`)) {
        return NextResponse.json({ error: 'Developer portal is disabled in production.' }, { status: 403 });
      }
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }

    if (allowedUserIds.length > 0 || allowedEmails.length > 0) {
      const email = ((sessionClaims?.email as string) || '').toLowerCase();
      const isAllowedId = allowedUserIds.includes(userId);
      const isAllowedEmail = Boolean(email && allowedEmails.includes(email));

      if (!isAllowedId && !isAllowedEmail) {
        // Reject non-admin logged-in users cleanly
        if (req.nextUrl.pathname.startsWith(`/api/${DEV_PORTAL_SLUG}`)) {
          return NextResponse.json({ error: 'Forbidden. Admin access only.' }, { status: 403 });
        }
        const homeUrl = new URL('/', req.url);
        return NextResponse.redirect(homeUrl);
      }
    }
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
