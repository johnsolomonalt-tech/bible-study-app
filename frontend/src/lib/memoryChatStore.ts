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
const memoryMessages = new Map<number, MemoryMessage[]>();

export function getMemoryChats(userId: string): MemoryChat[] {
  const chats = memoryChats.get(userId) || [];
  return chats.map(c => ({
    ...c,
    messages: memoryMessages.get(c.id) || c.messages || [],
  }));
}

export function addMemoryChat(userId: string, chat: MemoryChat) {
  const current = memoryChats.get(userId) || [];
  memoryChats.set(userId, [chat, ...current]);
}

export function updateMemoryChatTitle(chatId: number, title: string) {
  for (const [, chats] of memoryChats.entries()) {
    const found = chats.find(c => c.id === chatId);
    if (found) {
      found.title = title;
      break;
    }
  }
}

export function getMemoryMessages(chatId: number): MemoryMessage[] {
  return memoryMessages.get(chatId) || [];
}

export function addMemoryMessage(chatId: number, message: MemoryMessage) {
  const existing = memoryMessages.get(chatId) || [];
  memoryMessages.set(chatId, [...existing, message]);
}

export function deleteMemoryChat(chatId: number) {
  memoryMessages.delete(chatId);
  for (const [userId, chats] of memoryChats.entries()) {
    memoryChats.set(userId, chats.filter(c => c.id !== chatId));
  }
}
