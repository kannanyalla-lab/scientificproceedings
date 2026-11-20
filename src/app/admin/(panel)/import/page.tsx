import Link from "next/link";
import { getApiKey, isStalled, listImports } from "@/lib/importer/jobs";
import { stateLabel } from "./labels";
import { AutoRefresh, KeyForm, Uploader } from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ discarded?: string }> }) {
  const sp = await searchParams;
  const key = await getApiKey();
  const imports = await listImports();
  const running = imports.some((s) => (s.state === "running" || s.state === "queued") && !isStalled(s));
  return (
    <>
      {running ? <AutoRefresh seconds={6} /> : null}
      <div className="admin-head"><h1>Import an edition from PDF</h1></div>
      {sp.discarded ? <div className="alert alert--ok" style={{ marginBottom: 16 }}>The import was deleted.</div> : null}

      <div className="panel">
        <p style={{ marginTop: 0 }}>Upload the PDF of a new edition and the website reads it for you: the cover, editorial board and issue highlights, every article (title, authors, departments, abstract, full text, figures, tables, references and page numbers), Pharma Updates, Radiology and Dermatology Spotters, and the Scramble. You then check the result and publish it with one click.</p>
        <ol className="steps">
          <li>Upload the PDF below. Reading takes about 5 to 15 minutes; keep the website window open meanwhile.</li>
          <li>Check the extracted edition on the review page.</li>
          <li>Press <strong>Publish to website</strong>. You can still correct anything afterwards under Issues and Articles.</li>
        </ol>
      </div>

      <div className="panel">
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>1. Claude API key {key ? <span className="pill pill--ok" style={{ marginLeft: 6 }}>Set, ends in …{key.slice(-4)}</span> : <span className="pill pill--warn" style={{ marginLeft: 6 }}>Needed once</span>}</h2>
        {key ? (
          <details>
            <summary className="muted" style={{ cursor: "pointer" }}>Change the key</summary>
            <div style={{ marginTop: 12 }}><KeyForm hasKey /></div>
          </details>
        ) : (
          <>
            <p>The website uses Claude, an AI model, to read the PDF. It needs a Claude API key, which you set up once:</p>
            <ol className="steps" style={{ marginBottom: 16 }}>
              <li>Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> and sign in (or create an account).</li>
              <li>Open <strong>Billing</strong> and add some credit. Reading one edition costs roughly US$3 to $8.</li>
              <li>Open <strong>API keys</strong>, press <strong>Create key</strong>, name it &ldquo;Proceedings website&rdquo; and copy the key (it starts with sk-ant-).</li>
              <li>Paste it below and press <strong>Save key</strong>.</li>
            </ol>
            <KeyForm hasKey={false} />
          </>
        )}
      </div>

      <div className="panel">
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>2. Upload the edition PDF</h2>
        {!key ? <p className="muted">Save the Claude API key first.</p> : null}
        <Uploader disabled={!key} />
      </div>

      {imports.length ? (
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Imports</h2>
          <table className="table">
            <thead><tr><th>Edition</th><th>File</th><th>Uploaded</th><th>Status</th></tr></thead>
            <tbody>
              {imports.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/admin/import/${s.id}`}>{s.summary?.title || "Reading..."}</Link></td>
                  <td className="muted">{s.fileName}</td>
                  <td className="muted">{new Date(s.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td>{stateLabel(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
