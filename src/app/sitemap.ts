import type { MetadataRoute } from "next";
import { db } from "@/db";
import { articles, issues, pharmaUpdates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [is, as, ps] = await Promise.all([
    db.select({ slug: issues.slug, u: issues.updatedAt }).from(issues).where(eq(issues.published, true)),
    db.select({ slug: articles.slug, u: articles.updatedAt }).from(articles).where(eq(articles.published, true)),
    db.select({ slug: pharmaUpdates.slug, u: pharmaUpdates.updatedAt }).from(pharmaUpdates).where(eq(pharmaUpdates.published, true)),
  ]);
  const fixed = ["", "/issues", "/pharma-updates", "/radiology-spotters", "/scramble", "/about", "/submit", "/search"].map((p) => ({ url: SITE_URL + p }));
  return [
    ...fixed,
    ...is.map((r) => ({ url: `${SITE_URL}/issue/${r.slug}`, lastModified: r.u })),
    ...as.map((r) => ({ url: `${SITE_URL}/article/${r.slug}`, lastModified: r.u })),
    ...ps.map((r) => ({ url: `${SITE_URL}/pharma-updates/${r.slug}`, lastModified: r.u })),
  ];
}
