"use client";

import { Send, Square } from 'lucide-react';

export function ChatSendButton({ pending, disabled, onStop }: {
  pending: boolean;
  disabled: boolean;
  onStop: () => void;
}) {
  return pending ? (
    <button key="stop" type="button" className="chat-composer-action chat-composer-stop"
      onClick={event => { event.preventDefault(); onStop(); }}
      aria-label="Stop response" title="Stop response">
      <Square size={15} fill="currentColor" />
    </button>
  ) : (
    <button key="send" type="submit" className="chat-composer-action chat-composer-send" disabled={disabled}
      aria-label="Send message" title="Send message">
      <Send size={16} />
    </button>
  );
}
