import type { Metadata } from "next";
import Link from "next/link";
import IssueSwitcher from "@/components/IssueSwitcher";
import ScrambleGame from "@/components/ScrambleGame";
import { getScramble, issuesWith } from "@/lib/queries";
import { issueShort } from "@/lib/format";

export const metadata: Metadata = { title: "Scramble", description: "Unscramble the letters to reveal medical terms across specialties." };

export default async function ScramblePage({ searchParams }: PageProps<"/scramble">) {
  const sp = await searchParams;
  const issues = await issuesWith("scramble");
  const issue = issues.find((i) => i.slug === sp.issue) ?? issues[0];
  const items = issue ? await getScramble(issue.id) : [];
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Scramble</span></div>
          <h1>Scramble</h1>
          <p>Unscramble the letters to reveal the medical term. Type your answer and press Check, or Reveal if you&apos;re stuck. Spaces and hyphens don&apos;t matter.</p>
        </div>
      </div>
      <div className="container section" style={{ maxWidth: 900 }}>
        {!issue ? <p className="notice">No puzzles have been published yet.</p> : (
          <>
            <IssueSwitcher issues={issues} current={issue} base="/scramble" />
            <p style={{ marginBottom: 6 }}><strong>{issue.month} {issue.year}</strong> · {issueShort(issue)}</p>
            {issue.scrambleContributors ? <p className="muted">Compiled by {issue.scrambleContributors}</p> : null}
            <ScrambleGame key={issue.id} items={items.map(({ id, specialty, clue, scrambled, answer }) => ({ id, specialty, clue, scrambled, answer }))} />
          </>
        )}
      </div>
    </>
  );
}
