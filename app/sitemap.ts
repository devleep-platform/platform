import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://devleep.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE}/`,         lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/about`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/community`,lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/docs`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/security`, lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/terms`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
