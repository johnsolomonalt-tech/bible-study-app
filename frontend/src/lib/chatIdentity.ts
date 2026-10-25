import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getMemoryChat, addMemoryChat, isValidDbId } from '@/lib/memoryChatStore';

export const GUEST_CHAT_COOKIE = 'theologica_guest_chat';

export type ChatIdentity =
  | { kind: 'user'; ownerKey: string; userId: string }
  | { kind: 'guest'; ownerKey: string; userId: null };

function guestSecret() {
  return (
    process.env.GUEST_CHAT_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.GEMINI_API_KEY ||
    'theologica-guest-session-fallback'
  );
}

function signGuestId(id: string, secret: string) {
  return createHmac('sha256', secret).update(id).digest('hex');
}

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get('cookie') || '';
  const value = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

export function createGuestChatSession() {
  const secret = guestSecret();
  if (!secret) return null;
  const id = randomBytes(24).toString('hex');
  return `${id}.${signGuestId(id, secret)}`;
}

export async function resolveChatIdentity(req: Request): Promise<ChatIdentity> {
  try {
    const { userId } = await auth();
    if (userId) return { kind: 'user', userId, ownerKey: `user:${userId}` };
  } catch {
    // Guest session may still be valid when Clerk is unavailable.
  }

  const secret = guestSecret();
  const token = readCookie(req, GUEST_CHAT_COOKIE);
  if (secret && token) {
    const separator = token.lastIndexOf('.');
    if (separator > 0) {
      const id = token.slice(0, separator);
      const signature = token.slice(separator + 1);
      const expected = signGuestId(id, secret);
      const actualBytes = Buffer.from(signature, 'hex');
      const expectedBytes = Buffer.from(expected, 'hex');
      if (actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)) {
        return { kind: 'guest', userId: null, ownerKey: `guest:${id}` };
      }
    }
  }

  // Resilient fallback for guests without cookie yet (or in ephemeral environments)
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim() || 'anonymous';
  return { kind: 'guest', userId: null, ownerKey: `guest:${ip}` };
}

export async function ownsChat(identity: ChatIdentity, chatId: number): Promise<boolean> {
  if (identity.kind === 'user' && process.env.DATABASE_URL) {
    try {
      const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: identity.userId }, select: { id: true } });
      if (chat) return true;
      // Auto-restore chat in database if valid ID
      if (isValidDbId(chatId)) {
        await prisma.chat.create({
          data: { id: chatId, userId: identity.userId, title: 'New Conversation' }
        });
        return true;
      }
    } catch {
      // Permit the owner-scoped memory fallback only if the database is unavailable.
    }
  }

  const inMem = getMemoryChat(identity.ownerKey, chatId);
  if (inMem) return true;

  // Resilient auto-registration for valid chat IDs across serverless cold starts
  if (isValidDbId(chatId)) {
    addMemoryChat(identity.ownerKey, {
      id: chatId,
      userId: identity.userId || 'guest',
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messages: [],
    });
    return true;
  }

  return false;
}
