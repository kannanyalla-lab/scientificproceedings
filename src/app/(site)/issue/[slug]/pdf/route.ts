import { getIssueBySlug } from "@/lib/queries";
import { pdfFromImages, pdfResponse } from "@/lib/pdf";

/** The whole printed issue as one PDF. */
export async function GET(req: Request, ctx: RouteContext<"/issue/[slug]/pdf">) {
  const issue = await getIssueBySlug((await ctx.params).slug);
  if (!issue) return new Response("Not found", { status: 404 });
  if (issue.pdfUrl) return Response.redirect(new URL(issue.pdfUrl, req.url), 302);
  if (!issue.pageImages.length) return new Response("No PDF is available for this issue.", { status: 404 });
  const title = `KIMSHEALTH Scientific Proceedings, Volume ${issue.volume}, Issue ${String(issue.number).padStart(2, "0")}, ${issue.month} ${issue.year}`;
  const bytes = await pdfFromImages(issue.pageImages, req.url, { title });
  const dl = new URL(req.url).searchParams.has("download");
  return pdfResponse(bytes, `KIMSHEALTH-Scientific-Proceedings-${issue.month}-${issue.year}.pdf`, dl);
}
