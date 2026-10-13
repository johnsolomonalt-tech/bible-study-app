export const MAX_INT32 = 2147483647;

export function isValidDbId(id: number | null | undefined): boolean {
  return typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= MAX_INT32;
}

export interface MemoryMessage {
  id: number;
  content: string;
  role: string;
  chatId: number;
  createdAt: Date;
}

export interface MemoryChat {
  id: number;
  userId: string;
  title: string;
  createdAt: string;
  messages: MemoryMessage[];
}

const memoryChats = new Map<string, MemoryChat[]>();
const memoryMessages = new Map<string, MemoryMessage[]>();

export function getMemoryChats(userId: string): MemoryChat[] {
  const chats = memoryChats.get(userId) || [];
  return chats.map(c => ({
    ...c,
    messages: memoryMessages.get(messageKey(userId, c.id)) || c.messages || [],
  }));
}

export function addMemoryChat(userId: string, chat: MemoryChat) {
  const current = memoryChats.get(userId) || [];
  memoryChats.set(userId, [chat, ...current]);
}

export function getMemoryChat(userId: string, chatId: number): MemoryChat | undefined {
  return memoryChats.get(userId)?.find((chat) => chat.id === chatId);
}

function messageKey(userId: string, chatId: number) {
  return `${userId}:${chatId}`;
}

export function updateMemoryChatTitle(userId: string, chatId: number, title: string) {
  const found = getMemoryChat(userId, chatId);
  if (found) found.title = title;
}

export function getMemoryMessages(userId: string, chatId: number): MemoryMessage[] {
  return memoryMessages.get(messageKey(userId, chatId)) || [];
}

export function addMemoryMessage(userId: string, chatId: number, message: MemoryMessage) {
  const key = messageKey(userId, chatId);
  const existing = memoryMessages.get(key) || [];
  memoryMessages.set(key, [...existing, message]);
}

export function deleteMemoryChat(userId: string, chatId: number) {
  memoryMessages.delete(messageKey(userId, chatId));
  memoryChats.set(userId, (memoryChats.get(userId) || []).filter((chat) => chat.id !== chatId));
}
