"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon = 'trash',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on open & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-desc"
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
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              {/* Icon badge */}
              <div className={`p-3 rounded-2xl shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-xs'
                  : variant === 'warning'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs'
                  : 'bg-accent/10 text-accent border border-accent/20 shadow-xs'
              }`}>
                {icon === 'trash' ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
              </div>

              {/* Text content */}
              <div className="space-y-1.5 flex-1 pr-4">
                <h3 id="confirm-modal-title" className="text-base sm:text-lg font-bold text-fg tracking-tight">
                  {title}
                </h3>
                <p id="confirm-modal-desc" className="text-xs sm:text-sm text-fg-2 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-surface hover:bg-surface-hover text-fg transition-all cursor-pointer disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
                  variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 border border-rose-700/50'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 border border-amber-700/50'
                    : 'bg-accent hover:opacity-90 border border-accent/50'
                }`}
              >
                {isLoading ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
