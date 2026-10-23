import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://theologica-gamma.vercel.app'
  ).replace(/\/$/, '');
  const now = new Date();

  return [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];
}
