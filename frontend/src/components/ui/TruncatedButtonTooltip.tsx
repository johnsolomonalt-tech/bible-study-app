'use client';

import { useEffect, useState } from 'react';

type Tooltip = { text: string; left: number; top?: number; bottom?: number };

export function TruncatedButtonTooltip() {
  const [tip, setTip] = useState<Tooltip | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active: HTMLElement | null = null;
    let start: { x: number; y: number } | null = null;
    let heldControl: HTMLElement | null = null;
    let suppressClick = false;
    let titleOwner: HTMLElement | null = null;
    let originalTitle: string | null = null;

    const isTruncated = (element: HTMLElement) => {
      if (!element.getClientRects().length) return false;
      const style = getComputedStyle(element);
      const clamp = style.getPropertyValue('-webkit-line-clamp');
      const clipsText = style.textOverflow === 'ellipsis' || (clamp !== '' && clamp !== 'none');
      return clipsText && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
    };
    const findTruncated = (target: Element): HTMLElement | null => {
      let node: Element | null = target;
      const control = target.closest<HTMLElement>('button, a, [role="button"]');
      while (node && node !== control?.parentElement) {
        if (node instanceof HTMLElement && isTruncated(node)) return node;
        node = node.parentElement;
      }
      if (control) return Array.from(control.querySelectorAll<HTMLElement>('*')).find(isTruncated) || null;
      return null;
    };
    const restoreTitle = () => {
      if (titleOwner && originalTitle !== null) titleOwner.setAttribute('title', originalTitle);
      titleOwner = null;
      originalTitle = null;
    };
    const cancel = () => {
      clearTimeout(timer);
      active = null;
      start = null;
      heldControl = null;
      setTip(null);
      restoreTitle();
    };
    const show = (element: HTMLElement) => {
      const text = element.textContent?.trim().replace(/\s+/g, ' ');
      if (!text || !element.isConnected) return;
      const rect = element.getBoundingClientRect();
      const maxWidth = Math.min(360, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - maxWidth - 12));
      const above = rect.bottom > window.innerHeight - 180 && rect.top > 180;
      setTip({ text, left, ...(above ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }) });
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
      const element = findTruncated(event.target);
      if (element === active) return;
      cancel();
      if (!element) return;
      active = element;
      titleOwner = element.closest<HTMLElement>('[title]');
      if (titleOwner) {
        originalTitle = titleOwner.getAttribute('title');
        titleOwner.removeAttribute('title');
      }
      timer = setTimeout(() => show(element), 450);
    };
    const out = (event: PointerEvent) => {
      if (!active || event.pointerType === 'touch') return;
      const next = event.relatedTarget;
      const control = active.closest('button, a, [role="button"]');
      if (next instanceof Node && (active.contains(next) || control?.contains(next))) return;
      cancel();
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !(event.target instanceof Element)) return;
      cancel();
      const element = findTruncated(event.target);
      if (!element) return;
      active = element;
      start = { x: event.clientX, y: event.clientY };
      const control = element.closest<HTMLElement>('button, a, [role="button"]');
      timer = setTimeout(() => {
        heldControl = control;
        show(element);
      }, 600);
    };
    const move = (event: PointerEvent) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      if (active && !start) return;
      if (heldControl) {
        suppressClick = true;
        clearTimeout(timer);
        timer = setTimeout(cancel, 1500);
        start = null;
      } else cancel();
    };
    const click = (event: MouseEvent) => {
      if (suppressClick && heldControl?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
      }
      suppressClick = false;
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('click', click, true);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('scroll', cancel, true);
    return () => {
      clearTimeout(timer);
      restoreTitle();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('click', click, true);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('scroll', cancel, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div role="tooltip" className="fixed z-[100] pointer-events-none max-w-[min(360px,calc(100vw-24px))] max-h-[min(50vh,320px)] overflow-hidden rounded-lg bg-fg text-bg px-3 py-2 text-sm leading-snug shadow-lg break-words" style={{ left: tip.left, top: tip.top, bottom: tip.bottom }}>
      {tip.text}
    </div>
  );
}
