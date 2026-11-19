"use client";
import { startTransition, useActionState, useState } from "react";
import type { Field } from "@/lib/admin-entities";
import type { FormState } from "../../../actions";

type Props = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  fields: Field[];
  values: Record<string, string>;
  checks: Record<string, boolean>;
  issues: { value: string; label: string }[];
  submitLabel: string;
};

function FileField({ f, value }: { f: Field; value: string }) {
  const [url, setUrl] = useState(value);
  const isImg = f.accept?.startsWith("image");
  return (
    <div className="field">
      <label htmlFor={f.name}>{f.label}</label>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: isImg && url ? "96px 1fr" : "1fr", alignItems: "start" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {isImg && url ? <img src={url} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} /> : null}
        <div style={{ display: "grid", gap: 8 }}>
          <input id={f.name} name={f.name} type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a URL, or upload a file below" />
          <input name={`${f.name}__file`} type="file" accept={f.accept} aria-label={`Upload ${f.label}`} />
        </div>
      </div>
      {url && !isImg ? <div className="hint"><a href={url} target="_blank" rel="noopener">Open current file ↗</a></div> : null}
    </div>
  );
}

function Input({ f, value, checked, issues }: { f: Field; value: string; checked: boolean; issues: Props["issues"] }) {
  const req = f.required;
  const label = <label htmlFor={f.name}>{f.label}{req ? " *" : ""}</label>;
  const hint = f.hint ? <div className="hint">{f.hint}</div> : null;
  switch (f.type) {
    case "readonly":
      return (
        <div className="field">
          <label>{f.label}</label>
          {f.name === "fileUrl" && value ? <a href={value} target="_blank" rel="noopener">Download manuscript ↗</a>
            : <div style={{ whiteSpace: "pre-wrap", padding: "8px 0" }}>{value || <span className="muted">—</span>}</div>}
        </div>
      );
    case "checkbox":
      return <label className="check"><input type="checkbox" name={f.name} defaultChecked={checked} /> {f.label}</label>;
    case "file":
      return <FileField f={f} value={value} />;
    case "select":
      return <div className="field">{label}<select id={f.name} name={f.name} defaultValue={value} required={req}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>{hint}</div>;
    case "issue":
      return (
        <div className="field">{label}
          <select id={f.name} name={f.name} defaultValue={value} required={req}>
            {!req ? <option value="">No issue</option> : null}
            {issues.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>{hint}
        </div>
      );
    case "number":
      return <div className="field">{label}<input id={f.name} name={f.name} type="number" defaultValue={value} required={req} />{hint}</div>;
    case "text":
    case "keywords":
      return <div className="field">{label}<input id={f.name} name={f.name} type="text" defaultValue={value} required={req} />{hint}</div>;
    case "html":
      return <div className="field">{label}<textarea id={f.name} name={f.name} defaultValue={value} className="mono" style={{ minHeight: 360 }} />{hint}</div>;
    case "authors":
    case "affiliations":
    case "lines":
    case "abstract":
      return <div className="field">{label}<textarea id={f.name} name={f.name} defaultValue={value} className="mono" style={{ minHeight: f.type === "abstract" || f.type === "lines" ? 260 : 120 }} required={req} />{hint}</div>;
    default:
      return <div className="field">{label}<textarea id={f.name} name={f.name} defaultValue={value} required={req} />{hint}</div>;
  }
}

export default function EntityForm({ action, fields, values, checks, issues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Pair consecutive half-width fields into rows.
  const rows: Field[][] = [];
  for (const f of fields) {
    const last = rows[rows.length - 1];
    if (f.half && last && last.length === 1 && last[0].half) last.push(f);
    else rows.push([f]);
  }

  return (
    <form
      className="form"
      // Submit manually so React doesn't reset the fields, which would lose edits when a save fails.
      onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => formAction(fd)); }}
    >
      {state?.error ? <div className="alert alert--err" role="alert">{state.error}</div> : null}
      {state?.ok ? <div className="alert alert--ok" role="status">{state.ok}</div> : null}
      {rows.map((r, i) =>
        r.length === 2 ? (
          <div key={i} className="form-row">{r.map((f) => <Input key={f.name} f={f} value={values[f.name] ?? ""} checked={checks[f.name] ?? false} issues={issues} />)}</div>
        ) : (
          <Input key={i} f={r[0]} value={values[r[0].name] ?? ""} checked={checks[r[0].name] ?? false} issues={issues} />
        ),
      )}
      <div className="form-actions">
        <button className="btn btn--primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        {state?.ok ? <span className="muted" style={{ fontSize: ".85rem" }}>All changes saved.</span> : null}
      </div>
    </form>
  );
}
