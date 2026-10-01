"use client";

import { useSyncExternalStore } from 'react';

export interface ModifierKeyInfo {
  symbol: string; // '⌘' or 'Ctrl'
  text: string;   // 'Cmd' or 'Ctrl'
  shift: string;  // '⇧' or 'Shift+'
  isMac: boolean;
}

const MAC_INFO: ModifierKeyInfo = {
  symbol: '⌘',
  text: 'Cmd',
  shift: '⇧',
  isMac: true,
};

const NON_MAC_INFO: ModifierKeyInfo = {
  symbol: 'Ctrl',
  text: 'Ctrl',
  shift: 'Shift+',
  isMac: false,
};

export function isMacOS(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = window.navigator as { userAgentData?: { platform?: string }; platform?: string; userAgent?: string };
  const platform = nav?.userAgentData?.platform || nav?.platform || nav?.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function getModifierSnapshot(): ModifierKeyInfo {
  return isMacOS() ? MAC_INFO : NON_MAC_INFO;
}

function getServerSnapshot(): ModifierKeyInfo {
  return MAC_INFO;
}

function subscribe(_callback: () => void) {
  return () => {};
}

export function useModifierKey(): ModifierKeyInfo {
  return useSyncExternalStore(subscribe, getModifierSnapshot, getServerSnapshot);
}
