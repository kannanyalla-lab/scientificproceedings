import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentIssue } from "@/lib/queries";
import { JOURNAL, PUBLISHER } from "@/lib/site";
import { issueLabel } from "@/lib/format";
import { getJournalConfig, licenceOf } from "@/lib/journal-config";

export const metadata: Metadata = { title: "About the journal" };

export default async function AboutPage() {
  const [issue, cfg] = await Promise.all([getCurrentIssue(), getJournalConfig()]);
  const lic = licenceOf(cfg);
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>About</span></div>
          <h1>About the journal</h1>
          <p>
            {JOURNAL} is a peer-reviewed, open access clinical and scientific research journal published {cfg.frequency.toLowerCase()} by {PUBLISHER}.
            {cfg.issnPrint ? ` ISSN ${cfg.issnPrint} (Print).` : ""}{cfg.issnOnline ? ` e-ISSN ${cfg.issnOnline} (Online).` : ""}
          </p>
        </div>
      </div>
      <div className="section"><div className="container about-layout">
        <div className="prose">
          <h2>Aims and scope</h2>
          {issue?.description ? <p>{issue.description}</p> : null}
          <p>
            The journal publishes work from across clinical medicine, surgery, nursing, pharmacy and allied health
            sciences: original research, case reports, clinical and narrative reviews, alongside educational features
            such as Pharma Updates, Radiology Spotters and Scramble.
          </p>
          <h2>Article types</h2>
          <ul>
            <li><strong>Original Research</strong>: prospective and retrospective studies, trials, audits and quality-improvement projects.</li>
            <li><strong>Case Reports</strong> and <strong>Case Series</strong>: unusual presentations, diagnostic challenges and novel management.</li>
            <li><strong>Review Articles</strong> and <strong>Clinical Reviews</strong>: evidence-based overviews of a clinical topic.</li>
            <li><strong>Editorials</strong> and <strong>Letters to the Editor</strong>.</li>
          </ul>
          <h2 id="guidelines">Guidelines for authors</h2>
          <p>
            Manuscripts should follow the ICMJE Recommendations and the relevant EQUATOR reporting guideline, with a
            structured abstract, keywords, full affiliations for every author and Vancouver-style references.
            See the full <Link href="/policies/author-guidelines">author guidelines</Link>.
          </p>
          <h2>Peer review and ethics</h2>
          <p>
            Research articles are peer reviewed (see the <Link href="/policies/peer-review">peer review policy</Link>).
            The journal follows COPE and ICMJE guidance on ethics approval, consent, authorship, conflicts of interest
            and corrections (see <Link href="/policies/publication-ethics">publication ethics</Link>).
          </p>
          <h2>Open access and licence</h2>
          <p>
            All articles are free to read online immediately on publication and are published under the{" "}
            <a href={lic.url} target="_blank" rel="license noopener">{lic.label}</a> licence.
            See <Link href="/policies/open-access">open access and licensing</Link> and{" "}
            <Link href="/policies/archiving">archiving and preservation</Link>.
          </p>
          <h2 id="contact">Contact</h2>
          <p>
            {cfg.publisherAddress}<br />
            Email: <a href={`mailto:${cfg.contactEmail}`}>{cfg.contactEmail}</a> · Web: <a href="https://www.kimshealth.org" target="_blank" rel="noopener">www.kimshealth.org</a>
          </p>
          <p><Link className="btn btn--primary" href="/submit">Submit a manuscript</Link></p>
        </div>
        {issue?.editorialBoard.length ? (
          <aside id="board" className="board">
            <h2>Editorial board</h2>
            <p className="muted" style={{ fontSize: ".85rem" }}>As printed in {issueLabel(issue)}</p>
            {issue.editorialBoard.map((g) => (
              <div key={g.role} className="board__group">
                <h3>{g.role}</h3>
                {g.members.map((m) => (
                  <p key={m.name}><strong>{m.name}</strong>{m.title ? <span>{m.title}</span> : null}</p>
                ))}
              </div>
            ))}
            <p className="muted" style={{ fontSize: ".82rem" }}>{JOURNAL} is published by Dr. M.I. Sahadulla, Chairman &amp; Managing Director, KIMSHEALTH, Post Box No.1, Anayara P.O., Trivandrum 695 029.</p>
          </aside>
        ) : null}
      </div></div>
    </>
  );
}
