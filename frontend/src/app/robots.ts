import type { MetadataRoute } from 'next';
import { DEV_PORTAL_SLUG } from '@/lib/devConfig';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theologica.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/share/'],
      disallow: ['/api/', `/${DEV_PORTAL_SLUG}/`, `/${DEV_PORTAL_SLUG}`, '/dev', '/dev/', '/api/dev', '/api/dev/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
