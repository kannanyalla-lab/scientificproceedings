import Link from "next/link";
import { CONFIG_FIELDS, getJournalConfig, LICENCES } from "@/lib/journal-config";
import { saveJournalSettings } from "../../indexing-actions";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const sp = await searchParams;
  const cfg = await getJournalConfig();
  const groups = [...new Set(CONFIG_FIELDS.map((f) => f.group))];
  return (
    <>
      <div className="admin-head">
        <h1>Journal settings</h1>
        <Link className="btn btn--ghost" href="/admin/indexing">Indexing checklist</Link>
      </div>
      <p className="muted" style={{ maxWidth: 760 }}>
        These details appear on every article page, in citation downloads and in the files given to indexing services
        (Google Scholar, Crossref, DOAJ and others). Leave a box empty if you don&apos;t have the information yet.
      </p>
      {sp.saved ? <div className="alert alert--ok" role="status">Settings saved.</div> : null}
      {sp.error ? <div className="alert alert--err" role="alert">{String(sp.error)}</div> : null}
      <form action={saveJournalSettings} className="form panel" style={{ marginTop: 16 }}>
        {groups.map((g) => {
          const fields = CONFIG_FIELDS.filter((f) => f.group === g);
          const rows: (typeof fields)[] = [];
          for (const f of fields) {
            const last = rows[rows.length - 1];
            if (f.half && last && last.length === 1 && last[0].half) last.push(f); else rows.push([f]);
          }
          return (
            <div key={g} className="settings-group">
              <h2>{g}</h2>
              {rows.map((r, i) => (
                <div key={i} className={r.length === 2 ? "form-row" : undefined}>
                  {r.map((f) => (
                    <div key={f.name} className="field">
                      <label htmlFor={f.name}>{f.label}</label>
                      {f.type === "select" ? (
                        <select id={f.name} name={f.name} defaultValue={cfg[f.name]}>
                          {Object.entries(LICENCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea id={f.name} name={f.name} defaultValue={cfg[f.name]} style={{ minHeight: 70 }} />
                      ) : (
                        <input id={f.name} name={f.name} type="text" defaultValue={cfg[f.name]} />
                      )}
                      {f.hint ? <div className="hint">{f.hint}</div> : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
        <div className="form-actions"><button className="btn btn--primary">Save settings</button></div>
      </form>
    </>
  );
}
