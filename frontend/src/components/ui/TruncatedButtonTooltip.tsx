'use client';

import { useEffect, useState } from 'react';

// Desktop browsers provide native title tooltips. Touch browsers generally do not,
// so show the same text while a finger is held on a truncated button.
export function TruncatedButtonTooltip() {
  const [tip, setTip] = useState<{ text: string; y: number; below: boolean } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    let heldButton: HTMLButtonElement | null = null;
    let suppressClick = false;
    let titledButton: HTMLButtonElement | null = null;
    let originalTitle: string | null = null;

    const truncatedText = (button: HTMLButtonElement) => {
      const elements = [button, ...Array.from(button.querySelectorAll<HTMLElement>('*'))];
      const truncated = elements.find((element) => {
        const style = getComputedStyle(element);
        const clamp = style.getPropertyValue('-webkit-line-clamp');
        const clipped = style.textOverflow === 'ellipsis' || (clamp !== '' && clamp !== 'none');
        return clipped && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
      });
      return truncated?.textContent?.trim().replace(/\s+/g, ' ') || '';
    };
    const restoreTitle = () => {
      if (!titledButton) return;
      if (originalTitle === null) titledButton.removeAttribute('title');
      else titledButton.setAttribute('title', originalTitle);
      titledButton = null;
    };
    const hover = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const button = (event.target as Element).closest('button');
      if (!button || button === titledButton) return;
      restoreTitle();
      const text = truncatedText(button);
      if (!text) return;
      titledButton = button;
      originalTitle = button.getAttribute('title');
      button.title = text;
    };
    const leave = (event: PointerEvent) => {
      if (titledButton && !titledButton.contains(event.relatedTarget as Node | null)) restoreTitle();
    };
    const cancel = () => {
      clearTimeout(timer);
      start = null;
      heldButton = null;
      setTip(null);
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      cancel();
      const button = (event.target as Element).closest('button');
      if (!button) return;
      const text = truncatedText(button);
      if (!text) return;
      start = { x: event.clientX, y: event.clientY };
      const rect = button.getBoundingClientRect();
      timer = setTimeout(() => {
        heldButton = button;
        setTip({ text, y: rect.top < 120 ? rect.bottom + 8 : rect.top - 8, below: rect.top < 120 });
      }, 600);
    };
    const move = (event: PointerEvent) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel();
    };
    const up = () => {
      if (heldButton) {
        suppressClick = true;
        // Keep the tooltip readable briefly after release.
        clearTimeout(timer);
        timer = setTimeout(cancel, 1500);
        start = null;
      } else cancel();
    };
    const click = (event: MouseEvent) => {
      if (suppressClick && heldButton?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
      }
      suppressClick = false;
    };
    document.addEventListener('pointerover', hover);
    document.addEventListener('pointerout', leave);
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('click', click, true);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('scroll', cancel, true);
    return () => {
      clearTimeout(timer);
      restoreTitle();
      document.removeEventListener('pointerover', hover);
      document.removeEventListener('pointerout', leave);
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
    <div role="tooltip" className="fixed z-[100] pointer-events-none left-3 right-3 mx-auto w-fit max-w-[calc(100vw-24px)] rounded-lg bg-fg text-bg px-3 py-2 text-sm shadow-lg break-words" style={{ top: tip.y, transform: tip.below ? undefined : 'translateY(-100%)' }}>
      {tip.text}
    </div>
  );
}
