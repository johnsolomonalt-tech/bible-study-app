import { NextResponse } from 'next/server';
import { checkDevAuthorization } from '@/lib/devGuard';
import { clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export interface DevUserAccountResponse {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  imageUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
  lastUsedAt: string | null;
}

export async function GET() {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      limit: 100,
      orderBy: '-created_at',
    });

    const rawUsers = Array.isArray(response) ? response : (response?.data || []);
    const totalCount = (response as any)?.totalCount ?? rawUsers.length;

    // Fetch DB activity timestamps concurrently for all users
    // Strict Privacy Guardrail: We query strictly timestamps from Prisma models (Note, Canvas, Tracker, Highlight, Chat)
    // NEVER content, note text, canvas diagrams, or chat messages!
    const users: DevUserAccountResponse[] = await Promise.all(
      rawUsers.map(async (u) => {
        const emailAddresses = u.emailAddresses || [];
        const phoneNumbers = u.phoneNumbers || [];

        const primaryEmail =
          emailAddresses.find((e: any) => e.id === u.primaryEmailAddressId)?.emailAddress ||
          emailAddresses[0]?.emailAddress ||
          null;

        const primaryPhone =
          phoneNumbers.find((p: any) => p.id === u.primaryPhoneNumberId)?.phoneNumber ||
          phoneNumbers[0]?.phoneNumber ||
          null;

        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;

        let dbLastActiveDate: Date | null = null;
        try {
          const [lastNote, lastCanvas, lastTracker, lastHighlight, lastChat] = await Promise.all([
            prisma.note.findFirst({
              where: { userId: u.id },
              orderBy: { updatedAt: 'desc' },
              select: { updatedAt: true },
            }),
            prisma.canvas.findFirst({
              where: { userId: u.id },
              orderBy: { updatedAt: 'desc' },
              select: { updatedAt: true },
            }),
            prisma.tracker.findFirst({
              where: { userId: u.id },
              orderBy: { completedAt: 'desc' },
              select: { completedAt: true },
            }),
            prisma.highlight.findFirst({
              where: { userId: u.id },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
            prisma.chat.findFirst({
              where: { userId: u.id },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
          ]);

          const dbDates = [
            lastNote?.updatedAt,
            lastCanvas?.updatedAt,
            lastTracker?.completedAt,
            lastHighlight?.createdAt,
            lastChat?.createdAt,
          ].filter((d): d is Date => Boolean(d));

          if (dbDates.length > 0) {
            dbLastActiveDate = new Date(Math.max(...dbDates.map((d) => d.getTime())));
          }
        } catch (dbErr) {
          console.warn(`[DevConsole] Could not query DB timestamps for user ${u.id}:`, dbErr);
        }

        const clerkCreatedAt = u.createdAt ? new Date(u.createdAt) : null;
        const clerkLastSignIn = u.lastSignInAt ? new Date(u.lastSignInAt) : null;
        const clerkLastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;

        const candidateDates = [
          clerkLastActive,
          clerkLastSignIn,
          dbLastActiveDate,
        ].filter((d): d is Date => Boolean(d));

        const lastUsedAtDate = candidateDates.length > 0
          ? new Date(Math.max(...candidateDates.map((d) => d.getTime())))
          : (clerkLastSignIn || clerkCreatedAt);

        return {
          id: u.id,
          username: u.username || null,
          fullName,
          email: primaryEmail,
          phoneNumber: primaryPhone,
          imageUrl: u.imageUrl || null,
          createdAt: clerkCreatedAt ? clerkCreatedAt.toISOString() : new Date().toISOString(),
          lastSignInAt: clerkLastSignIn ? clerkLastSignIn.toISOString() : null,
          lastActiveAt: clerkLastActive ? clerkLastActive.toISOString() : null,
          lastUsedAt: lastUsedAtDate ? lastUsedAtDate.toISOString() : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      totalCount,
      users,
    });
  } catch (err: any) {
    console.error('[DevConsole] Failed to fetch users list:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch registered users list',
        users: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
