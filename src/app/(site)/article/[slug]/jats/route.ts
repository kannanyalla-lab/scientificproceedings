// JATS XML of one article (for PubMed Central, DOAJ, Scopus and other aggregators).
import { getArticleBySlug } from "@/lib/queries";
import { getJournalConfig } from "@/lib/journal-config";
import { jatsArticle } from "@/lib/indexing/jats";

export async function GET(req: Request, ctx: RouteContext<"/article/[slug]/jats">) {
  const data = await getArticleBySlug((await ctx.params).slug);
  if (!data) return new Response("Not found", { status: 404 });
  const cfg = await getJournalConfig();
  const download = new URL(req.url).searchParams.has("download");
  return new Response(jatsArticle(data.article, data.issue, cfg), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      ...(download ? { "Content-Disposition": `attachment; filename="${data.article.slug.slice(0, 60)}.xml"` } : {}),
    },
  });
}
