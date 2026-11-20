import Link from "next/link";
import { notFound } from "next/navigation";
import { ENTITIES, toFormString } from "@/lib/admin-entities";
import { getRow, issueOptions } from "@/lib/admin-data";
import { deleteEntity, saveEntity } from "../../../actions";
import EntityForm from "./EntityForm";
import DeleteButton from "./DeleteButton";

export default async function EditEntity({ params, searchParams }: PageProps<"/admin/[entity]/[id]">) {
  const { entity, id } = await params;
  const sp = await searchParams;
  const cfg = ENTITIES[entity];
  if (!cfg) notFound();
  const isNew = id === "new";
  if (isNew && !cfg.canCreate) notFound();
  const row = isNew ? null : await getRow(entity, Number(id));
  if (!isNew && !row) notFound();
  const issues = await issueOptions();

  const defaults: Record<string, unknown> = {
    published: true, articleType: "Original Research", sortOrder: 0, caseNo: 1,
    issueId: typeof sp.issue === "string" ? sp.issue : issues.find((i) => i.isCurrent)?.value ?? issues[0]?.value ?? "",
    year: new Date().getFullYear(), month: "March",
  };
  const values: Record<string, string> = {};
  const checks: Record<string, boolean> = {};
  for (const f of cfg.fields) {
    const v = row ? row[f.name] : defaults[f.name];
    if (f.type === "checkbox") checks[f.name] = Boolean(v);
    else values[f.name] = toFormString(f, v);
  }

  const publicPath = row && cfg.publicPath ? cfg.publicPath(row) : null;
  const title = isNew ? `New ${cfg.label.toLowerCase()}` : String(row?.title || row?.answer || row?.diagnosis || (entity === "issues" ? `${row?.month} ${row?.year}` : cfg.label));

  return (
    <>
      <div className="crumbs"><Link href={`/admin/${entity}`}>{cfg.plural}</Link><span aria-hidden>›</span><span>{isNew ? "New" : "Edit"}</span></div>
      <div className="admin-head">
        <h1 style={{ maxWidth: 820 }}>{title}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {publicPath ? <a className="btn btn--ghost btn--sm" href={publicPath} target="_blank" rel="noopener">View on site ↗</a> : null}
          {!isNew ? <DeleteButton action={deleteEntity.bind(null, entity, Number(id))} label={cfg.label.toLowerCase()} /> : null}
        </div>
      </div>
      {sp.saved ? <div className="alert alert--ok" style={{ marginBottom: 14 }}>Saved.</div> : null}
      <div className="panel">
        <EntityForm
          action={saveEntity.bind(null, entity, id)}
          fields={cfg.fields}
          values={values}
          checks={checks}
          issues={issues.map(({ value, label }) => ({ value, label }))}
          submitLabel={isNew ? `Create ${cfg.label.toLowerCase()}` : "Save changes"}
        />
      </div>
    </>
  );
}
