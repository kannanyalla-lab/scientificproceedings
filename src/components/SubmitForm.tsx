"use client";
import { useState } from "react";
import { ARTICLE_TYPES } from "@/lib/site";

export default function SubmitForm() {
  const [state, setState] = useState<{ status: "idle" | "sending" | "ok" | "error"; message?: string }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: new FormData(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      form.reset();
      setState({ status: "ok", message: `Thank you. Your manuscript was received (reference #${data.id}).` });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }

  if (state.status === "ok") return <div className="alert alert--ok" role="status">{state.message}</div>;

  return (
    <form className="form" onSubmit={onSubmit}>
      {state.status === "error" ? <div className="alert alert--err" role="alert">{state.message}</div> : null}
      <div className="form-row">
        <div className="field"><label htmlFor="name">Corresponding author name *</label><input id="name" name="name" type="text" required maxLength={200} /></div>
        <div className="field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" required maxLength={200} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" maxLength={40} /></div>
        <div className="field"><label htmlFor="affiliation">Department and institution</label><input id="affiliation" name="affiliation" type="text" maxLength={300} /></div>
      </div>
      <div className="field"><label htmlFor="title">Manuscript title *</label><input id="title" name="title" type="text" required maxLength={500} /></div>
      <div className="field">
        <label htmlFor="articleType">Article type</label>
        <select id="articleType" name="articleType" defaultValue="Original Research">{ARTICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="field"><label htmlFor="abstract">Abstract</label><textarea id="abstract" name="abstract" maxLength={5000} /></div>
      <div className="field">
        <label htmlFor="file">Manuscript file *</label>
        <input id="file" name="file" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        <div className="hint">PDF or Word, up to 4 MB.</div>
      </div>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="website">Leave this empty</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="check"><input type="checkbox" name="consent" required /> I confirm all authors approve this submission and it is not under review elsewhere.</label>
      <div><button className="btn btn--primary" disabled={state.status === "sending"}>{state.status === "sending" ? "Sending…" : "Submit manuscript"}</button></div>
    </form>
  );
}
