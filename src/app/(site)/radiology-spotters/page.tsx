import type { Metadata } from "next";
import Link from "next/link";
import IssueSwitcher from "@/components/IssueSwitcher";
import SpotterCaseCard from "@/components/SpotterCaseCard";
import { getSpotters, issuesWith } from "@/lib/queries";
import { issueShort } from "@/lib/format";

export const metadata: Metadata = { title: "Radiology Spotters", description: "A case-based quiz on diagnostic imaging." };

export default async function SpottersPage({ searchParams }: PageProps<"/radiology-spotters">) {
  const sp = await searchParams;
  const issues = await issuesWith("spotters");
  const issue = issues.find((i) => i.slug === sp.issue) ?? issues[0];
  const cases = issue ? await getSpotters(issue.id) : [];
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Radiology Spotters</span></div>
          <h1>Radiology Spotters</h1>
          <p>A case-based quiz on diagnostic imaging. Study each image, commit to a diagnosis, then reveal the answer. Click an image to enlarge it.</p>
        </div>
      </div>
      <div className="container section">
        {!issue ? <p className="notice">No spotter cases have been published yet.</p> : (
          <>
            <IssueSwitcher issues={issues} current={issue} base="/radiology-spotters" />
            <p style={{ marginBottom: 6 }}><strong>{issue.month} {issue.year}</strong> · {issueShort(issue)}</p>
            {issue.spotterContributors ? <p className="muted">Contributed by {issue.spotterContributors}</p> : null}
            {cases.map((c) => <SpotterCaseCard key={c.id} caseNo={c.caseNo} imageUrl={c.imageUrl} images={c.images} question={c.question} diagnosis={c.diagnosis} findings={c.findings} />)}
          </>
        )}
      </div>
    </>
  );
}
