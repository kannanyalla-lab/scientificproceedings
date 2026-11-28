/* eslint-disable @next/next/no-img-element -- page scans and figures from the uploads folder */
import Link from "next/link";
import { notFound } from "next/navigation";
import { isStalled, readStatus } from "@/lib/importer/jobs";
import { existingIssue, isNewest, readResult } from "@/lib/importer/publish";
import { PRICE, DEFAULT_MODEL } from "@/lib/importer/constants";
import { discardAction, publishAction, retryImport } from "@/app/admin/import-actions";
import { AutoRefresh } from "../ImportClient";
import { stateLabel } from "../labels";

export const dynamic = "force-dynamic";

export default async function ImportDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ published?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[\w-]{6,64}$/.test(id)) notFound();
  const s = await readStatus(id);
  if (!s) notFound();
  const stalled = isStalled(s);
  const working = (s.state === "running" || s.state === "queued") && !stalled;
  const cost = s.model === DEFAULT_MODEL ? (s.usage.input * PRICE.input + s.usage.output * PRICE.output) / 1e6 : null;

  return (
    <>
      {working ? <AutoRefresh /> : null}
      <div className="admin-head">
        <h1>{s.summary?.title || "Importing edition"} {stateLabel(s)}</h1>
        <Link className="btn btn--ghost" href="/admin/import">All imports</Link>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        {s.fileName}{s.pages ? ` · ${s.pages} pages` : ""}{cost !== null && cost > 0 ? ` · Claude usage so far about US$${cost.toFixed(2)}` : ""}
      </p>

      {working ? (
        <div className="panel">
          <p style={{ marginTop: 0 }}><strong>{s.step || "Starting"}...</strong></p>
          <div className="progress"><span style={{ width: `${Math.max(3, s.progress)}%` }} /></div>
          <p className="muted" style={{ fontSize: ".88rem", marginBottom: 0 }}>This page updates by itself. You can leave it and come back; keep the website window open until it finishes (usually 5 to 15 minutes).</p>
        </div>
      ) : null}

      {s.state === "failed" || stalled ? (
        <div className="panel">
          <div className="alert alert--err" style={{ marginBottom: 14 }}>
            {stalled ? "The import stopped before it finished, probably because the website was closed." : `The import stopped: ${s.error || "unknown error"}`}
          </div>
          <p>Press <strong>Try again</strong> to carry on from where it stopped. Work already done is kept, so it won&apos;t be paid for twice.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <form action={retryImport.bind(null, id)}><button className="btn btn--primary">Try again</button></form>
            <form action={discardAction.bind(null, id)}><button className="btn btn--danger">Delete this import</button></form>
          </div>
        </div>
      ) : null}

      {s.state === "review" || s.state === "published" ? <Review id={id} published={s.state === "published"} publishedSlug={s.publishedSlug} justPublished={!!sp.published} warnings={s.warnings} /> : null}
    </>
  );
}

async function Review({ id, published, publishedSlug, justPublished, warnings }: { id: string; published: boolean; publishedSlug?: string; justPublished: boolean; warnings: string[] }) {
  const b = await readResult(id);
  if (!b) return <div className="alert alert--err">The results of this import are missing.</div>;
  const { issue } = b;
  const old = published ? null : await existingIssue(b);
  const newest = await isNewest(b);
  const pdfPage = (printed?: string | null) => (printed && /^\d+$/.test(printed) ? Number(printed) + (issue.pageOffset ?? 0) : null);

  return (
    <>
      {published ? (
        <div className="panel">
          <div className="alert alert--ok" style={{ marginBottom: 12 }}>{justPublished ? "Published! The edition is now on the website." : "This edition has been published."}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn btn--primary" href={`/issue/${publishedSlug}`} target="_blank">View it on the website ↗</Link>
            <Link className="btn btn--ghost" href="/admin/articles">Edit articles</Link>
            <Link className="btn btn--ghost" href="/admin/issues">Edit issue details</Link>
          </div>
        </div>
      ) : (
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Check, then publish</h2>
          <p>Look through the edition below. Open any article to see it as it will appear. Small mistakes can be fixed after publishing under <strong>Articles</strong>; if something is badly wrong, delete this import and upload the PDF again.</p>
          {old ? <div className="notice" style={{ marginBottom: 14 }}><strong>{old.month} {old.year} (Volume {old.volume}, Issue {old.number}) is already on the website.</strong> Publishing replaces it, including any changes made to it in the editor panel.</div> : null}
          <form action={publishAction.bind(null, id)} style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="current" defaultChecked={newest || !!old?.isCurrent} /> Make this the current issue (shown on the home page)
            </label>
            <button className="btn btn--primary">Publish to website</button>
          </form>
          <form action={discardAction.bind(null, id)} style={{ marginTop: 12 }}><button className="linklike muted">Delete this import instead</button></form>
        </div>
      )}

      {warnings.length ? (
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Please check ({warnings.length})</h2>
          <ul style={{ margin: 0 }}>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      ) : null}

      <div className="panel" style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 24 }}>
        {issue.coverUrl ? <img src={issue.coverUrl} alt="Cover" style={{ width: 180, border: "1px solid var(--line)", borderRadius: 6 }} /> : <div />}
        <div>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>{issue.month} {issue.year} · Volume {issue.volume}, Issue {String(issue.number).padStart(2, "0")}</h2>
          <p className="muted" style={{ fontSize: ".9rem" }}>
            {b.articles.length} articles · {b.pharma.length} Pharma Updates · {b.spotters.length} Spotter cases · {b.scramble.length} Scramble words · {issue.pageImages?.length ?? 0} pages
          </p>
          {issue.highlights?.length ? <><strong style={{ fontSize: ".9rem" }}>Issue highlights</strong><ul style={{ marginTop: 4 }}>{issue.highlights.map((h) => <li key={h}>{h}</li>)}</ul></> : null}
          {issue.editorialBoard?.length ? (
            <details><summary style={{ cursor: "pointer" }}><strong style={{ fontSize: ".9rem" }}>Editorial board</strong></summary>
              {issue.editorialBoard.map((g) => <p key={g.role} style={{ fontSize: ".88rem" }}><strong>{g.role}:</strong> {g.members.map((m) => m.name + (m.title ? ` (${m.title})` : "")).join("; ")}</p>)}
            </details>
          ) : null}
        </div>
      </div>

      <h2 style={{ fontSize: "1.1rem" }}>Articles</h2>
      {b.articles.map((a, i) => {
        const p = pdfPage(a.pageStart);
        return (
          <details className="import-art" key={i}>
            <summary>
              <span className="badge">{a.articleType}</span>
              <strong>{a.title}</strong>
              <span className="muted" style={{ fontSize: ".85rem" }}>{a.pageStart ? `pp. ${a.pageStart}${a.pageEnd && a.pageEnd !== a.pageStart ? `–${a.pageEnd}` : ""}` : ""}</span>
            </summary>
            <div className="import-art__body">
              <p style={{ fontSize: ".92rem" }}>{(a.authors ?? []).map((x, j) => <span key={j}>{j ? ", " : ""}{x.name}{x.aff ? <sup>{x.aff}</sup> : null}</span>)}</p>
              {(a.affiliations ?? []).map((af) => <p key={af.key} className="muted" style={{ fontSize: ".85rem", margin: "0 0 4px" }}><sup>{af.key}</sup> {af.text}</p>)}
              {a.correspondingEmail ? <p className="muted" style={{ fontSize: ".85rem" }}>Corresponding: {a.correspondingAuthor} · {a.correspondingEmail}</p> : null}
              {p && issue.pageImages?.[p - 1] ? <p style={{ fontSize: ".85rem" }}><a href={issue.pageImages[p - 1]} target="_blank" rel="noopener">Compare with the printed page ↗</a></p> : null}
              <div className="article-body">
                {(a.abstract ?? []).length ? <h2>Abstract</h2> : null}
                {(a.abstract ?? []).map((s, j) => <div key={j}>{s.heading ? <h3>{s.heading}</h3> : null}<p>{s.text}</p></div>)}
                {a.keywords?.length ? <p><strong>Keywords:</strong> {a.keywords.join("; ")}</p> : null}
                <div dangerouslySetInnerHTML={{ __html: a.bodyHtml || "" }} />
                {a.notesHtml ? <><h2>Declarations</h2><div dangerouslySetInnerHTML={{ __html: a.notesHtml }} /></> : null}
                {a.refs?.length ? <><h2>References ({a.refs.length})</h2><ol style={{ fontSize: ".85rem" }}>{a.refs.map((r, j) => <li key={j}>{r}</li>)}</ol></> : null}
              </div>
            </div>
          </details>
        );
      })}

      {b.pharma.length ? <>
        <h2 style={{ fontSize: "1.1rem" }}>Pharma Updates</h2>
        {b.pharma.map((ph, i) => (
          <details className="import-art" key={i}>
            <summary><strong>{ph.title}</strong></summary>
            <div className="import-art__body article-body">
              {ph.imageUrl ? <img src={ph.imageUrl} alt="" style={{ maxWidth: 260 }} /> : null}
              <p><em>{ph.summary}</em></p>
              <div dangerouslySetInnerHTML={{ __html: ph.bodyHtml || "" }} />
            </div>
          </details>
        ))}
      </> : null}

      {b.spotters.length ? <>
        <h2 style={{ fontSize: "1.1rem" }}>Spotters</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 20 }}>
          {b.spotters.map((sc, i) => (
            <div className="panel" key={i} style={{ margin: 0, padding: 14, fontSize: ".88rem" }}>
              <strong>{sc.category} {sc.caseNo}</strong>
              {(sc.images ?? []).map((src) => <img key={src} src={src} alt="" style={{ width: "100%", marginTop: 6 }} />)}
              <p>{sc.question}</p>
              {sc.options?.length ? <p className="muted">{sc.options.join(" · ")}</p> : null}
              <p><strong>Answer:</strong> {sc.diagnosis}</p>
            </div>
          ))}
        </div>
      </> : null}

      {b.scramble.length ? <>
        <h2 style={{ fontSize: "1.1rem" }}>Scramble</h2>
        <table className="table" style={{ marginBottom: 20 }}>
          <thead><tr><th>Specialty</th><th>Clue</th><th>Letters</th><th>Answer</th></tr></thead>
          <tbody>{b.scramble.map((w, i) => <tr key={i}><td>{w.specialty}</td><td>{w.clue}</td><td style={{ fontFamily: "monospace" }}>{w.scrambled}</td><td>{w.answer}</td></tr>)}</tbody>
        </table>
      </> : null}

      <h2 style={{ fontSize: "1.1rem" }}>Pages</h2>
      <div className="import-pages panel">
        {(issue.pageImages ?? []).map((src, i) => <a key={src} href={src} target="_blank" rel="noopener"><img src={src} alt={`Page ${i + 1}`} loading="lazy" /></a>)}
      </div>
    </>
  );
}
