export interface MemoryNote {
  id: number;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const memoryNotes = new Map<string, MemoryNote[]>();

export function getMemoryNotes(userId: string): MemoryNote[] {
  return memoryNotes.get(userId) || [];
}

export function addMemoryNote(userId: string, note: MemoryNote) {
  const current = memoryNotes.get(userId) || [];
  memoryNotes.set(userId, [note, ...current]);
}

export function updateMemoryNote(
  userId: string,
  id: number,
  data: { title?: string; content?: string }
): MemoryNote | null {
  const userNotes = memoryNotes.get(userId) || [];
  const found = userNotes.find((n) => n.id === id);
  if (found) {
    if (typeof data.title === 'string') found.title = data.title;
    if (typeof data.content === 'string') found.content = data.content;
    found.updatedAt = new Date().toISOString();
    return found;
  }
  return null;
}

export function deleteMemoryNote(userId: string, id: number) {
  const userNotes = memoryNotes.get(userId) || [];
  memoryNotes.set(
    userId,
    userNotes.filter((n) => n.id !== id)
  );
}
