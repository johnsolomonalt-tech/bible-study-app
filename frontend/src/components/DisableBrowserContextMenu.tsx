'use client';

import { useEffect } from 'react';

export function DisableBrowserContextMenu() {
  useEffect(() => {
    const preventBrowserMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener('contextmenu', preventBrowserMenu);
    return () => document.removeEventListener('contextmenu', preventBrowserMenu);
  }, []);

  return null;
}
