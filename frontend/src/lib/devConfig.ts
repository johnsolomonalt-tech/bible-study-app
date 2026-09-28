/**
 * Configuration for the obfuscated, secure Developer & Admin Portal.
 * Default slug: 'console-7d8f9e6b4a3c21d0'
 * Configurable via NEXT_PUBLIC_DEV_PORTAL_SLUG or DEV_PORTAL_SLUG
 */

export const DEV_PORTAL_SLUG = 
  process.env.NEXT_PUBLIC_DEV_PORTAL_SLUG || 
  process.env.DEV_PORTAL_SLUG || 
  'console-7d8f9e6b4a3c21d0';

export const DEV_PORTAL_PATH = `/${DEV_PORTAL_SLUG}`;
export const DEV_API_BASE = `/api/${DEV_PORTAL_SLUG}`;
