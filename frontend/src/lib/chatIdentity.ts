import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getMemoryChat, isValidDbId } from '@/lib/memoryChatStore';

export const GUEST_CHAT_COOKIE = 'theologica_guest_chat';

export type ChatIdentity =
  | { kind: 'user'; ownerKey: string; userId: string }
  | { kind: 'guest'; ownerKey: string; userId: null; authorizedChatId?: number };

// A cookie-bound capability preserves guest ownership across serverless cold starts.
// History stays on the device; this token contains only the conversation ID.
export function createGuestChatToken(ownerKey: string, chatId: number) {
  const secret = guestSecret();
  if (!secret || !ownerKey.startsWith('guest:') || !isValidDbId(chatId)) return null;
  const signature = createHmac('sha256', secret).update(`chat:v1:${ownerKey}:${chatId}`).digest('hex');
  return `${chatId}.${signature}`;
}

function readAuthorizedChat(req: Request, ownerKey: string): number | undefined {
  const token = req.headers.get('x-guest-chat-token') || '';
  if (!/^\d{1,10}\.[a-f0-9]{64}$/.test(token)) return;
  const id = Number(token.split('.')[0]);
  const expected = createGuestChatToken(ownerKey, id);
  if (expected && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return id;
}

function guestSecret() {
  return (
    process.env.GUEST_CHAT_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    null
  );
}

function signGuestId(id: string, secret: string) {
  return createHmac('sha256', secret).update(id).digest('hex');
}

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get('cookie') || '';
  const value = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  try {
    return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
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
      if (/^[a-f0-9]{48}$/.test(id) && /^[a-f0-9]{64}$/.test(signature) && actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)) {
        const ownerKey = `guest:${id}`;
        return { kind: 'guest', userId: null, ownerKey, authorizedChatId: readAuthorizedChat(req, ownerKey) };
      }
    }
  }

  // An unverified browser has no shared identity. POST /api/chats issues its cookie.
  return { kind: 'guest', userId: null, ownerKey: '' };
}

export async function ownsChat(identity: ChatIdentity, chatId: number): Promise<boolean> {
  if (!identity.ownerKey || !isValidDbId(chatId)) return false;
  if (identity.kind === 'guest' && identity.authorizedChatId === chatId) return true;
  if (identity.kind === 'user' && process.env.DATABASE_URL) {
    try {
      const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { userId: true } });
      // An existing database record always determines ownership, including on ID collisions.
      if (chat) return chat.userId === identity.userId;
    } catch {
      // Only an already registered, owner-scoped memory chat may be used during an outage.
    }
  }
  return Boolean(getMemoryChat(identity.ownerKey, chatId));
}
