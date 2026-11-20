// DOAJ article metadata XML for one issue. Editor panel only.
import { getAdmin } from "@/lib/auth";
import { getIssueBySlug, getIssueArticles } from "@/lib/queries";
import { getJournalConfig } from "@/lib/journal-config";
import { doajXml } from "@/lib/indexing/exports";

export async function GET(_req: Request, ctx: RouteContext<"/admin/indexing/doaj/[slug]">) {
  if (!(await getAdmin())) return new Response("Sign in to the editor panel first.", { status: 401 });
  const issue = await getIssueBySlug((await ctx.params).slug);
  if (!issue) return new Response("Issue not found", { status: 404 });
  const [cfg, list] = await Promise.all([getJournalConfig(), getIssueArticles(issue.id)]);
  return new Response(doajXml(issue, list, cfg), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="doaj-${issue.slug}.xml"`,
    },
  });
}
