import type { Metadata } from "next";
import Link from "next/link";
import JournalFacts from "@/components/JournalFacts";
import { getCurrentIssue } from "@/lib/queries";
import { issueLabel } from "@/lib/format";
import { getJournalConfig } from "@/lib/journal-config";

export const metadata: Metadata = { title: "Editorial board", alternates: { canonical: "/editorial-board" } };

export default async function EditorialBoardPage() {
  const [issue, cfg] = await Promise.all([getCurrentIssue(), getJournalConfig()]);
  const board = issue?.editorialBoard ?? [];
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><Link href="/policies">Policies</Link><span aria-hidden>›</span><span>Editorial board</span></div>
          <h1>Editorial board</h1>
          <p>The editors responsible for {cfg.title}{issue ? `, as listed in ${issueLabel(issue)}` : ""}.</p>
        </div>
      </div>
      <div className="section"><div className="container about-layout">
        <div className="prose board board--page">
          {board.length ? board.map((g) => (
            <div key={g.role} className="board__group">
              <h3>{g.role}</h3>
              {g.members.map((m) => (
                <p key={m.name}><strong>{m.name}</strong>{m.title ? <span>{m.title}</span> : null}</p>
              ))}
            </div>
          )) : <p className="muted">The editorial board will be listed here.</p>}
          <p className="muted" style={{ fontSize: ".88rem", marginTop: 24 }}>
            The board is taken from the masthead of the current issue. Editors can update it in the Editor panel under Issues.
            For editorial correspondence write to <a href={`mailto:${cfg.contactEmail}`}>{cfg.contactEmail}</a>.
          </p>
        </div>
        <JournalFacts current="editorial-board" />
      </div></div>
    </>
  );
}
