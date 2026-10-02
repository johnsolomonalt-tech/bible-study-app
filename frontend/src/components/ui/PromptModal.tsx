"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, X } from 'lucide-react';

export interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  isOpen,
  title,
  message,
  initialValue,
  placeholder = 'Enter title...',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xl ring-1 ring-black/10 overflow-hidden relative"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-muted hover:text-fg p-1.5 rounded-xl hover:bg-fg/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-fg tracking-tight">
                    {title}
                  </h3>
                  {message && (
                    <p className="text-xs text-muted mt-0.5">{message}</p>
                  )}
                </div>
              </div>

              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg border border-border text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface hover:bg-surface-hover text-fg transition-all cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-accent text-white shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {confirmLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
