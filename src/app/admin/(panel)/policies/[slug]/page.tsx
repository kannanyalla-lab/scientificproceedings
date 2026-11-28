import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicy } from "@/lib/journal-config";
import { savePolicyAction } from "../../../indexing-actions";

export default async function PolicyEdit({ params, searchParams }: PageProps<"/admin/policies/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getPolicy(slug);
  if (!p) notFound();
  return (
    <>
      <div className="admin-head">
        <h1>{p.title}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn--ghost" href="/admin/policies">All policy pages</Link>
          <Link className="btn btn--ghost" href={`/policies/${p.slug}`} target="_blank">View on site ↗</Link>
        </div>
      </div>
      {sp.saved ? <div className="alert alert--ok" role="status">Saved.</div> : null}
      <div className="panel" style={{ background: "#fff8e6", borderColor: "#f1dfae" }}>
        <strong>Please check before approving:</strong>
        <ul style={{ margin: "8px 0 0" }}>{p.checks.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      <form action={savePolicyAction} className="form panel">
        <input type="hidden" name="slug" value={p.slug} />
        <div className="field"><label htmlFor="title">Page title</label><input id="title" name="title" type="text" defaultValue={p.title} /></div>
        <div className="field">
          <label htmlFor="body">Text</label>
          <textarea id="body" name="body" className="mono" defaultValue={p.body} style={{ minHeight: 520 }} />
          <div className="hint">
            Leave a blank line between paragraphs. <code>## Heading</code> starts a section, <code>- item</code> makes a bullet,
            <code>1. item</code> a numbered step, <code>**bold**</code>, and <code>[link text](https://…)</code> a link.
            Words in double braces, like <code>{"{{email}}"}</code> or <code>{"{{licence}}"}</code>, are filled in from Journal settings.
          </div>
        </div>
        <label className="check"><input type="checkbox" name="approved" defaultChecked={p.approved} /> Approved by the editors</label>
        <div className="form-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn--primary">Save</button>
          <button className="btn btn--danger" name="reset" value="1" formNoValidate>Reset to the template</button>
        </div>
      </form>
    </>
  );
}
