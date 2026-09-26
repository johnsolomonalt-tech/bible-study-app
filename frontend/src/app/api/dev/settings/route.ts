import { NextResponse } from 'next/server';
import { checkDevAuthorization } from '@/lib/devGuard';
import { getAdminConfig } from '@/lib/devAuth';
import prisma from '@/lib/prisma';

export async function GET() {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  const config = await getAdminConfig();

  return NextResponse.json({
    success: true,
    settings: {
      adminUserId: config?.adminUserId || guard.userId,
      adminEmail: config?.adminEmail || guard.email,
      allowedEmails: config?.allowedEmails || [],
      allowedUserIds: config?.allowedUserIds || [],
      hasConfig: Boolean(config),
    },
  });
}

export async function POST(req: Request) {
  const guard = await checkDevAuthorization();
  if (!guard.authorized) {
    return guard.response;
  }

  try {
    const { action, email } = await req.json();

    if (action === 'add_email') {
      const normEmail = (email || '').trim().toLowerCase();
      if (!normEmail || !normEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
      }

      const config = await getAdminConfig();
      const currentEmails = new Set(config?.allowedEmails || []);
      currentEmails.add(normEmail);

      await prisma.devAdminConfig.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          passwordHash: config?.passwordHash || '',
          salt: config?.salt || '',
          adminUserId: config?.adminUserId || guard.userId,
          adminEmail: config?.adminEmail || guard.email,
          allowedEmails: Array.from(currentEmails),
        },
        update: {
          allowedEmails: Array.from(currentEmails),
        },
      });

      return NextResponse.json({ success: true, allowedEmails: Array.from(currentEmails) });
    }

    if (action === 'remove_email') {
      const normEmail = (email || '').trim().toLowerCase();
      const config = await getAdminConfig();
      const currentEmails = (config?.allowedEmails || []).filter(e => e.toLowerCase() !== normEmail);

      await prisma.devAdminConfig.update({
        where: { id: 'default' },
        data: {
          allowedEmails: currentEmails,
        },
      });

      return NextResponse.json({ success: true, allowedEmails: currentEmails });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
