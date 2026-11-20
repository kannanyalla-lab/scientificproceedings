// RSS 2.0 feed of the latest articles (with Dublin Core and PRISM fields that
// aggregators such as Google Scholar, JournalTOCs and Feedly read).
import { getJournalConfig } from "@/lib/journal-config";
import { publishedArticles } from "@/lib/indexing/data";
import { rssXml } from "@/lib/indexing/exports";

export const dynamic = "force-dynamic";

export async function GET() {
  const [cfg, rows] = await Promise.all([getJournalConfig(), publishedArticles({ limit: 60 })]);
  return new Response(rssXml(rows, cfg), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
