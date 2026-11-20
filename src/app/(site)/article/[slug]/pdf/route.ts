import { getArticleBySlug } from "@/lib/queries";
import { issuePageImages, pdfFromImages, pdfResponse } from "@/lib/pdf";

/** The article's pages from the printed issue, as a PDF. */
export async function GET(req: Request, ctx: RouteContext<"/article/[slug]/pdf">) {
  const data = await getArticleBySlug((await ctx.params).slug);
  if (!data) return new Response("Not found", { status: 404 });
  const { article: a, issue } = data;
  if (a.pdfUrl) return Response.redirect(new URL(a.pdfUrl, req.url), 302);
  const start = parseInt(a.pageStart || "", 10), end = parseInt(a.pageEnd || a.pageStart || "", 10);
  if (!issue || !issue.pageImages.length || !start) return new Response("No PDF is available for this article.", { status: 404 });
  const srcs = issuePageImages(issue, start, end || start);
  if (!srcs.length) return new Response("No PDF is available for this article.", { status: 404 });
  const bytes = await pdfFromImages(srcs, req.url, { title: a.title, author: a.authors.map((x) => x.name).join(", "), keywords: a.keywords });
  const dl = new URL(req.url).searchParams.has("download");
  return pdfResponse(bytes, `KSP-${issue.year}-${issue.volume}-${issue.number}-p${start}-${a.slug.slice(0, 50)}.pdf`, dl);
}
