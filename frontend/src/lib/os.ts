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
  const nav = window.navigator as { userAgentData?: { platform?: string }; platform?: string; userAgent?: string };
  const platform = nav?.userAgentData?.platform || nav?.platform || nav?.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function getModifierInfo(): ModifierKeyInfo {
  const mac = isMacOS();
  return {
    symbol: mac ? '⌘' : 'Ctrl',
    text: mac ? 'Cmd' : 'Ctrl',
    shift: mac ? '⇧' : 'Shift+',
    isMac: mac,
  };
}

export function useModifierKey(): ModifierKeyInfo {
  const [mod, setMod] = useState<ModifierKeyInfo>(getModifierInfo);

  useEffect(() => {
    setMod(getModifierInfo());
  }, []);

  return mod;
}
