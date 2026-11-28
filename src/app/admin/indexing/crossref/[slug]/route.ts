// Crossref deposit XML (schema 5.3.1) for one issue. Editor panel only.
import { getAdmin } from "@/lib/auth";
import { getIssueBySlug, getIssueArticles } from "@/lib/queries";
import { getJournalConfig } from "@/lib/journal-config";
import { crossrefXml } from "@/lib/indexing/exports";

export async function GET(_req: Request, ctx: RouteContext<"/admin/indexing/crossref/[slug]">) {
  if (!(await getAdmin())) return new Response("Sign in to the editor panel first.", { status: 401 });
  const issue = await getIssueBySlug((await ctx.params).slug);
  if (!issue) return new Response("Issue not found", { status: 404 });
  const [cfg, list] = await Promise.all([getJournalConfig(), getIssueArticles(issue.id)]);
  const { xml, warnings } = crossrefXml(issue, list, cfg);
  const note = warnings.length ? `<!--\n  Please fix before uploading:\n${warnings.map((w) => "  - " + w.replace(/--/g, "-")).join("\n")}\n-->\n` : "";
  return new Response(xml.replace(/^(<\?xml[^>]*>\n)/, `$1${note}`), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="crossref-${issue.slug}.xml"`,
    },
  });
}
