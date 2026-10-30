export interface GuestHistoryMessage { role: 'user' | 'model'; content: string }

/** Bound context sent with stateless guest requests; attachments remain on the device. */
export function buildGuestHistory(messages: { role: string; content: string; isStreaming?: boolean }[]): GuestHistoryMessage[] {
  let remaining = 50_000;
  const history: GuestHistoryMessage[] = [];
  for (const message of messages.slice(-20).reverse()) {
    if (message.isStreaming || !['user', 'model'].includes(message.role) || !message.content || /^\*\*(?:Connection )?Error:/.test(message.content)) continue;
    const content = message.content.replace(/__GENERATED_IMAGE__[\s\S]*?__END_IMAGE__/g, '[generated image]').slice(0, Math.min(10_000, remaining));
    if (!content) break;
    history.unshift({ role: message.role as GuestHistoryMessage['role'], content });
    remaining -= content.length;
  }
  return history;
}

export function isValidGuestHistory(value: unknown): value is GuestHistoryMessage[] {
  return Array.isArray(value) && value.length <= 20 && value.every(message =>
    message && typeof message === 'object' && ['user', 'model'].includes(message.role) &&
    typeof message.content === 'string' && message.content.length <= 10_000,
  ) && value.reduce((total, message) => total + message.content.length, 0) <= 50_000;
}
