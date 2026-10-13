import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getMemoryChat } from '@/lib/memoryChatStore';

export const GUEST_CHAT_COOKIE = 'theologica_guest_chat';
const isProd = process.env.NODE_ENV === 'production';

export type ChatIdentity =
  | { kind: 'user'; ownerKey: string; userId: string }
  | { kind: 'guest'; ownerKey: string; userId: null };

function guestSecret() {
  return process.env.GUEST_CHAT_SECRET || process.env.CLERK_SECRET_KEY ||
    (isProd ? null : 'theologica-local-guest-session-secret');
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

export async function resolveChatIdentity(req: Request): Promise<ChatIdentity | null> {
  try {
    const { userId } = await auth();
    if (userId) return { kind: 'user', userId, ownerKey: `user:${userId}` };
  } catch {
    // Guest session may still be valid when Clerk is unavailable.
  }

  const secret = guestSecret();
  const token = readCookie(req, GUEST_CHAT_COOKIE);
  if (!secret || !token) return null;
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const id = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = signGuestId(id, secret);
  const actualBytes = Buffer.from(signature, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  return { kind: 'guest', userId: null, ownerKey: `guest:${id}` };
}

export async function ownsChat(identity: ChatIdentity, chatId: number): Promise<boolean> {
  if (identity.kind === 'user' && process.env.DATABASE_URL) {
    try {
      const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: identity.userId }, select: { id: true } });
      if (chat) return true;
    } catch {
      // Permit the owner-scoped memory fallback only if the database is unavailable.
    }
  }
  return Boolean(getMemoryChat(identity.ownerKey, chatId));
}
