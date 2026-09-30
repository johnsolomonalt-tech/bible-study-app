import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theologica.app';
  const now = new Date();

  return [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/~offline`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
