import type { MetadataRoute } from "next";
import { db } from "@/db";
import { issues, pharmaUpdates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { baseUrl, getJournalConfig, getPolicies } from "@/lib/journal-config";
import { publishedArticles } from "@/lib/indexing/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cfg = await getJournalConfig();
  const SITE = baseUrl(cfg);
  const [is, as, ps, policies] = await Promise.all([
    db.select({ slug: issues.slug, u: issues.updatedAt, current: issues.isCurrent }).from(issues).where(eq(issues.published, true)),
    publishedArticles(),
    db.select({ slug: pharmaUpdates.slug, u: pharmaUpdates.updatedAt }).from(pharmaUpdates).where(eq(pharmaUpdates.published, true)),
    getPolicies(),
  ]);
  const fixed = ["", "/issues", "/issue/current", "/about", "/editorial-board", "/contact", "/policies", "/submit", "/pharma-updates", "/radiology-spotters", "/scramble"]
    .map((p) => ({ url: SITE + p, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.5 }));
  return [
    ...fixed,
    ...policies.map((p) => ({ url: `${SITE}/policies/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.4 })),
    ...is.map((r) => ({ url: `${SITE}/issue/${r.slug}`, lastModified: r.u, priority: r.current ? 0.9 : 0.7 })),
    ...as.map(({ article: r }) => ({ url: `${SITE}/article/${r.slug}`, lastModified: r.updatedAt, priority: 0.8 })),
    ...ps.map((r) => ({ url: `${SITE}/pharma-updates/${r.slug}`, lastModified: r.u, priority: 0.4 })),
  ];
}
