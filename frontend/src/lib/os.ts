"use client";

import { useState, useEffect } from 'react';

export interface ModifierKeyInfo {
  symbol: string; // '⌘' or 'Ctrl'
  text: string;   // 'Cmd' or 'Ctrl'
  shift: string;  // '⇧' or 'Shift+'
  isMac: boolean;
}

export function isMacOS(): boolean {
  if (typeof window === 'undefined') return true;
  // Modern userAgentData check or userAgent fallback
  const nav = window.navigator as any;
  const platform = nav?.userAgentData?.platform || nav?.platform || nav?.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function useModifierKey(): ModifierKeyInfo {
  const [mod, setMod] = useState<ModifierKeyInfo>({
    symbol: '⌘',
    text: 'Cmd',
    shift: '⇧',
    isMac: true,
  });

  useEffect(() => {
    const mac = isMacOS();
    setMod({
      symbol: mac ? '⌘' : 'Ctrl',
      text: mac ? 'Cmd' : 'Ctrl',
      shift: mac ? '⇧' : 'Shift+',
      isMac: mac,
    });
  }, []);

  return mod;
}
