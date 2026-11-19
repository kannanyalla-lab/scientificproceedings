import type { Metadata } from "next";
import Link from "next/link";
import { JOURNAL, PUBLISHER } from "@/lib/site";

export const metadata: Metadata = { title: "About the journal" };

export default function AboutPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>About</span></div>
          <h1>About the journal</h1>
          <p>{JOURNAL} is a clinical and scientific research journal published by {PUBLISHER}.</p>
        </div>
      </div>
      <div className="container section">
        <div className="prose">
          <h2>Aims and scope</h2>
          <p>
            The journal publishes peer-reviewed work from across clinical medicine, surgery, nursing, pharmacy and allied
            health sciences. It showcases original research, case series and case reports from KIMSHEALTH clinicians and
            collaborators, alongside educational features such as Pharma Updates, Radiology Spotters and Scramble.
          </p>
          <h2>Article types</h2>
          <ul>
            <li><strong>Original Research</strong>: prospective and retrospective studies, trials and audits.</li>
            <li><strong>Case Series</strong> and <strong>Case Reports</strong>: unusual presentations, diagnostic challenges and novel management.</li>
            <li><strong>Review Articles</strong>, <strong>Editorials</strong> and <strong>Letters to the Editor</strong>.</li>
          </ul>
          <h2 id="guidelines">Guidelines for authors</h2>
          <ul>
            <li>Structure original research with an abstract (Background, Methods, Results, Conclusion), introduction, methods, results, discussion and conclusion.</li>
            <li>Provide up to seven keywords and full affiliations for every author, and name one corresponding author with an email address.</li>
            <li>Cite references in the order they appear, in Vancouver style.</li>
            <li>Supply figures as high-resolution JPG or PNG with numbered captions, and remove anything that could identify a patient.</li>
            <li>Confirm ethics committee approval and informed consent where applicable.</li>
          </ul>
          <p><Link className="btn btn--primary" href="/submit">Submit a manuscript</Link></p>
        </div>
      </div>
    </>
  );
}
