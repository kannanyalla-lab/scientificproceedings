import Link from "next/link";
import { notFound } from "next/navigation";
import { ENTITIES } from "@/lib/admin-entities";
import { issueOptions, listRows } from "@/lib/admin-data";

function cell(name: string, v: unknown) {
  if (name === "published") return v ? <span className="pill pill--ok">Published</span> : <span className="pill">Draft</span>;
  if (name === "isCurrent") return v ? <span className="pill pill--ok">Current</span> : null;
  if (name === "status") return <span className={`pill ${v === "Received" ? "pill--warn" : ""}`}>{String(v)}</span>;
  if (v instanceof Date) return v.toLocaleDateString("en-IN");
  return String(v ?? "");
}

export default async function EntityList({ params, searchParams }: PageProps<"/admin/[entity]">) {
  const { entity } = await params;
  const sp = await searchParams;
  const cfg = ENTITIES[entity];
  if (!cfg) notFound();
  const hasIssue = cfg.fields.some((f) => f.type === "issue");
  const issueFilter = typeof sp.issue === "string" && sp.issue ? Number(sp.issue) : undefined;
  const [rows, issues] = await Promise.all([listRows(entity, issueFilter), hasIssue ? issueOptions() : Promise.resolve([])]);

  return (
    <>
      <div className="admin-head">
        <h1>{cfg.plural}</h1>
        {cfg.canCreate ? <Link className="btn btn--primary" href={`/admin/${entity}/new${issueFilter ? `?issue=${issueFilter}` : ""}`}>New {cfg.label.toLowerCase()}</Link> : null}
      </div>
      {sp.deleted ? <div className="alert alert--ok" style={{ marginBottom: 14 }}>Deleted.</div> : null}
      {hasIssue && issues.length ? (
        <form className="tabs" style={{ alignItems: "center" }}>
          <label htmlFor="issue" className="muted" style={{ fontSize: ".85rem" }}>Issue:</label>
          <select id="issue" name="issue" defaultValue={issueFilter ? String(issueFilter) : ""} className="input" style={{ width: "auto" }}>
            <option value="">All issues</option>
            {issues.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn btn--ghost btn--sm">Filter</button>
        </form>
      ) : null}
      {rows.length === 0 ? <div className="panel muted">Nothing here yet.</div> : (
        <table className="table">
          <thead><tr>{cfg.listColumns.map((c) => <th key={c.name}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                {cfg.listColumns.map((c, i) => (
                  <td key={c.name}>{i === 0 ? <Link href={`/admin/${entity}/${r.id}`}><strong>{cell(c.name, r[c.name as keyof typeof r])}</strong></Link> : cell(c.name, r[c.name as keyof typeof r])}</td>
                ))}
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <Link href={`/admin/${entity}/${r.id}`}>Edit</Link>
                  {cfg.publicPath && r.published !== false ? <> · <a href={cfg.publicPath(r) || "/"} target="_blank" rel="noopener">View ↗</a></> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
