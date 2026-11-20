import Link from "next/link";
import { getPolicies } from "@/lib/journal-config";

export default async function PoliciesAdmin() {
  const policies = await getPolicies();
  return (
    <>
      <div className="admin-head"><h1>Policy pages</h1></div>
      <p className="muted" style={{ maxWidth: 760 }}>
        Indexing services check that a journal publishes these policies. Each page started as a template written for
        this journal. Please read each one, change anything that does not match how the journal actually works,
        and tick <strong>Approved by the editors</strong>.
      </p>
      <div className="panel">
        <table className="table">
          <thead><tr><th>Page</th><th>Status</th><th>Last saved</th><th /></tr></thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.slug}>
                <td><Link href={`/admin/policies/${p.slug}`}>{p.title}</Link><div className="muted" style={{ fontSize: ".8rem" }}>{p.summary}</div></td>
                <td>{p.approved ? <span className="pill pill--ok">Approved</span> : <span className="pill pill--warn">Draft: needs editor review</span>}</td>
                <td className="muted">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-IN") : "Template"}</td>
                <td style={{ textAlign: "right" }}><Link href={`/policies/${p.slug}`} target="_blank">View ↗</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: ".85rem" }}>The editorial board page uses the masthead of the current issue (Issues → editorial board).</p>
    </>
  );
}
