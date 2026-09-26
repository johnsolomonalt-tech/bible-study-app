import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  verifyDevPassword,
  updateDevPassword,
  isAuthorizedAdmin,
  verifyDevSessionToken,
  DEV_COOKIE_NAME,
} from '@/lib/devAuth';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    const isDevAdmin = await isAuthorizedAdmin(userId, primaryEmail);
    if (!isDevAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify dev session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(DEV_COOKIE_NAME)?.value;
    if (!sessionCookie || !verifyDevSessionToken(sessionCookie, userId).valid) {
      return NextResponse.json({ error: 'Developer session expired. Please re-enter current passcode.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current password and new password are required' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return NextResponse.json({ error: 'New password must be at least 4 characters long' }, { status: 400 });
    }

    const isCurrentValid = await verifyDevPassword(currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    await updateDevPassword(newPassword, userId, primaryEmail || undefined);

    return NextResponse.json({
      success: true,
      message: 'Developer password changed successfully',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Failed to update developer password' }, { status: 500 });
  }
}
