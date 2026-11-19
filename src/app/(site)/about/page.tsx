import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentIssue } from "@/lib/queries";
import { JOURNAL, PUBLISHER } from "@/lib/site";
import { issueLabel } from "@/lib/format";

export const metadata: Metadata = { title: "About the journal" };

export default async function AboutPage() {
  const issue = await getCurrentIssue();
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>About</span></div>
          <h1>About the journal</h1>
          <p>{JOURNAL} is a clinical and scientific research journal published by {PUBLISHER}.</p>
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
          <ul>
            <li>Structure original research with an abstract (Background, Methods, Results, Conclusion), introduction, methods, results, discussion and conclusion.</li>
            <li>Provide up to seven keywords and full affiliations for every author, and name one corresponding author with an email address.</li>
            <li>Cite references in the order they appear, in Vancouver style, with a DOI or PMID wherever one exists.</li>
            <li>Supply figures as high-resolution JPG or PNG with numbered captions, and remove anything that could identify a patient.</li>
            <li>Confirm ethics committee approval and informed consent where applicable, and declare conflicts of interest and funding.</li>
          </ul>
          <h2>Open access and licence</h2>
          <p>All articles are free to read online. Content may be shared for non-commercial purposes with attribution; no commercial reuse.</p>
          <h2 id="contact">Contact</h2>
          <p>
            KIMSHEALTH, P.B. No.1, Anayara P.O., Trivandrum 695029, Kerala, India<br />
            Email: <a href="mailto:kimsproceedings@kimsglobal.com">kimsproceedings@kimsglobal.com</a> · Web: <a href="https://www.kimshealth.org" target="_blank" rel="noopener">www.kimshealth.org</a>
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
