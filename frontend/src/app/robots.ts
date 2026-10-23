import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://theologica-gamma.vercel.app'
  ).replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/share/'],
      disallow: ['/api/', '/console-*'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
