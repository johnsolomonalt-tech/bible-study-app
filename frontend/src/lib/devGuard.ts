import { cookies } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  isAuthorizedAdmin,
  verifyDevSessionToken,
  DEV_COOKIE_NAME,
} from '@/lib/devAuth';

export interface DevGuardSuccess {
  authorized: true;
  userId: string;
  email: string | null;
}

export interface DevGuardFailure {
  authorized: false;
  response: NextResponse;
}

export async function checkDevAuthorization(): Promise<DevGuardSuccess | DevGuardFailure> {
  // 1. Check Clerk authentication
  let clerkUserId: string | null = null;
  try {
    const clerkAuth = await auth();
    clerkUserId = clerkAuth.userId;
  } catch {
    // Unauthenticated
  }

  if (!clerkUserId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication required. Please sign in with Clerk.' },
        { status: 401 }
      ),
    };
  }

  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || null;

  // 2. Check Admin authorization
  const isAdmin = await isAuthorizedAdmin(clerkUserId, primaryEmail);
  if (!isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Access denied. You are not authorized to view the developer portal.' },
        { status: 403 }
      ),
    };
  }

  // 3. Check dev password session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(DEV_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Developer session locked. Password unlock required.', locked: true },
        { status: 401 }
      ),
    };
  }

  const tokenValidation = verifyDevSessionToken(sessionToken, clerkUserId);
  if (!tokenValidation.valid) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Developer session expired or invalid. Please unlock again.', locked: true },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    userId: clerkUserId,
    email: primaryEmail,
  };
}
