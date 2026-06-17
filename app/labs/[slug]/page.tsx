import type { Metadata } from "next";
import LabPageClient from "./LabPageClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.devleep.com";
const BASE = "https://devleep.com";

// Generate a static shell page plus individual pages for every published lab.
// The CF Pages _redirects rule rewrites unknown slugs to __shell, so this is
// additive — known labs get rich per-slug HTML, everything else falls back.
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/labs?published=true`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const slugs = (data.labs ?? []).map((lab: { slug: string }) => ({ slug: lab.slug }));
    return [{ slug: "__shell" }, ...slugs];
  } catch {
    return [{ slug: "__shell" }];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  if (params.slug === "__shell") {
    return {
      title: "DevOps Incident Lab",
      description:
        "Hands-on DevOps incident lab on real AWS infrastructure. SSH into a broken system, diagnose the failure, and fix it.",
      robots: { index: false }, // shell page should not appear in results
    };
  }

  try {
    const res = await fetch(`${API}/labs/${params.slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const { lab } = await res.json();

    const difficulty = lab.difficulty ?? "intermediate";
    const estimatedMin = lab.estimated_minutes ?? 30;
    const tags: string[] = lab.content?.tags ?? [];
    const description =
      lab.content?.briefing?.narrative?.replace(/\n/g, " ").slice(0, 155) ??
      lab.description ??
      `Practice ${lab.title} on real AWS infrastructure. Fix the incident, validate your fix, and build production-ready DevOps skills.`;

    return {
      title: lab.title,
      description,
      keywords: [
        ...tags,
        "devops lab",
        "hands-on devops",
        "incident lab",
        `${difficulty} devops`,
        "aws infrastructure",
        "free devops training",
        "Devleep",
      ],
      openGraph: {
        type: "website",
        title: `${lab.title} | Devleep`,
        description,
        url: `${BASE}/labs/${params.slug}`,
        images: [{ url: "/OG-image.png", width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${lab.title} | Devleep`,
        description,
      },
      alternates: { canonical: `${BASE}/labs/${params.slug}` },
      other: {
        "devleep:difficulty": difficulty,
        "devleep:estimated-minutes": String(estimatedMin),
      },
    };
  } catch {
    return {
      title: "DevOps Lab",
      description:
        "Hands-on DevOps incident lab on real AWS infrastructure.",
    };
  }
}

export default function LabPage() {
  return <LabPageClient />;
}
