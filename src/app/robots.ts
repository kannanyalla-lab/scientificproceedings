import type { MetadataRoute } from "next";
import { baseUrl, getJournalConfig } from "@/lib/journal-config";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const cfg = await getJournalConfig();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/files/manuscripts"] }],
    sitemap: `${baseUrl(cfg)}/sitemap.xml`,
    host: baseUrl(cfg),
  };
}
