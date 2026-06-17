import type { MetadataRoute } from "next";

const BASE = "https://devleep.com";
const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.devleep.com";

export const dynamic = "force-static";

async function getLabSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API}/labs?published=true`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.labs ?? []).map((lab: { slug: string }) => lab.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const labSlugs = await getLabSlugs();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,         lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/catalog`,  lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/tracks`,   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/about`,    lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/community`,lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/docs`,     lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/security`, lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/terms`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const labPages: MetadataRoute.Sitemap = labSlugs.map((slug) => ({
    url: `${BASE}/labs/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...labPages];
}
