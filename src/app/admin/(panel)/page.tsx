import Link from "next/link";
import { dashboardStats } from "@/lib/admin-data";

export default async function Dashboard() {
  const s = await dashboardStats();
  return (
    <>
      <div className="admin-head">
        <h1>Dashboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn--ghost" href="/admin/issues/new">New issue</Link>
          <Link className="btn btn--primary" href="/admin/articles/new">New article</Link>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat"><strong>{s.nIssues}</strong><span>Issues</span></div>
        <div className="stat"><strong>{s.nArticles}</strong><span>Articles</span></div>
        <div className="stat"><strong>{s.views}</strong><span>Article views</span></div>
        <div className="stat"><strong>{s.nSubs}</strong><span>Submissions</span></div>
        <div className="stat"><strong>{s.newSubs}</strong><span>Awaiting review</span></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem" }}>Latest submissions</h2>
          {s.recent.length === 0 ? <p className="muted">No submissions yet.</p> : (
            <table className="table"><tbody>
              {s.recent.map((r) => (
                <tr key={r.id}><td><Link href={`/admin/submissions/${r.id}`}>{r.title}</Link><div className="muted" style={{ fontSize: ".8rem" }}>{r.name} · {r.createdAt.toLocaleDateString("en-IN")}</div></td><td><span className={`pill ${r.status === "Received" ? "pill--warn" : ""}`}>{r.status}</span></td></tr>
              ))}
            </tbody></table>
          )}
        </div>
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem" }}>Most read articles</h2>
          <table className="table"><tbody>
            {s.top.map((a) => <tr key={a.id}><td><Link href={`/admin/articles/${a.id}`}>{a.title}</Link></td><td style={{ textAlign: "right" }}>{a.views}</td></tr>)}
          </tbody></table>
        </div>
      </div>
    </>
  );
}
