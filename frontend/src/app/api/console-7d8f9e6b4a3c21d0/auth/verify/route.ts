import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  verifyDevPassword,
  isAuthorizedAdmin,
  claimAdminRoleIfNeeded,
  createDevSessionToken,
  DEV_COOKIE_NAME,
} from '@/lib/devAuth';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required. Please sign in with Clerk.' }, { status: 401 });
    }

    const user = await currentUser();
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    // Check if user is authorized as developer admin
    const authorized = await isAuthorizedAdmin(userId, primaryEmail);
    if (!authorized) {
      return NextResponse.json({ error: 'Access denied. You are not an authorized admin.' }, { status: 403 });
    }

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const isValid = await verifyDevPassword(password);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect developer password' }, { status: 401 });
    }

    // Bind this user as the admin if no admin was bound yet
    await claimAdminRoleIfNeeded(userId, primaryEmail);

    // Create session token and set secure HttpOnly cookie
    const token = createDevSessionToken(userId);
    const response = NextResponse.json({
      success: true,
      message: 'Developer session verified',
      user: {
        id: userId,
        email: primaryEmail,
      },
    });

    response.cookies.set({
      name: DEV_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error('Dev auth verify error:', err);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
  }
}
