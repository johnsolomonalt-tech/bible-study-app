// These formats match the chat API's inline-data types and text extraction path.
const binaryTypes: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf',
};
const textExtensions = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'html', 'htm', 'xml', 'log']);

export const CHAT_ATTACHMENT_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.markdown,.json,.csv,.html,.htm,.xml,.log';

export function classifyChatAttachment(file: { name: string; type: string; size: number }):
  | { kind: 'image' | 'pdf' | 'document'; mimeType: string }
  | { error: string } {
  const extension = file.name.toLowerCase().split('.').pop() || '';
  const mimeType = binaryTypes[extension];
  if (mimeType) {
    if (file.size === 0) return { error: 'This file is empty.' };
    if (file.type && file.type !== mimeType && file.type !== 'application/octet-stream') return { error: 'File type not supported.' };
    if (file.size > 15_000_000) return { error: 'File is too large. Choose a file under 15 MB.' };
    return { kind: extension === 'pdf' ? 'pdf' : 'image', mimeType };
  }
  if (file.name.includes('.') && textExtensions.has(extension)) {
    if (file.size === 0) return { error: 'This file is empty.' };
    if (file.type && !file.type.startsWith('text/') && !['application/json', 'application/xml', 'application/octet-stream', ...(extension === 'csv' ? ['application/vnd.ms-excel'] : [])].includes(file.type)) return { error: 'File type not supported.' };
    if (file.size > 95_000) return { error: 'Text file is too large. Choose a file under 95 KB.' };
    return { kind: 'document', mimeType: file.type || 'text/plain' };
  }
  return { error: 'File type not supported.' };
}
