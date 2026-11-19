import type { Metadata } from "next";
import Link from "next/link";
import IssueSwitcher from "@/components/IssueSwitcher";
import SpotterCaseCard from "@/components/SpotterCaseCard";
import { getSpotters, issuesWith } from "@/lib/queries";
import { issueShort } from "@/lib/format";

export const metadata: Metadata = { title: "Spotters", description: "Case-based image quizzes in radiology and dermatology." };

export default async function SpottersPage({ searchParams }: PageProps<"/radiology-spotters">) {
  const sp = await searchParams;
  const issues = await issuesWith("spotters");
  const issue = issues.find((i) => i.slug === sp.issue) ?? issues[0];
  const cases = issue ? await getSpotters(issue.id) : [];
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Spotters</span></div>
          <h1>Spotters</h1>
          <p>Case-based image quizzes in radiology and dermatology. Study each image, commit to an answer, then reveal it. Click an image to enlarge it.</p>
        </div>
      </div>
      <div className="container section">
        {!issue ? <p className="notice">No spotter cases have been published yet.</p> : (
          <>
            <IssueSwitcher issues={issues} current={issue} base="/radiology-spotters" />
            <p style={{ marginBottom: 6 }}><strong>{issue.month} {issue.year}</strong> · {issueShort(issue)}</p>
            {[...new Set(cases.map((c) => c.category))].map((cat) => {
              const group = cases.filter((c) => c.category === cat);
              const by = cat === "Radiology" ? issue.spotterContributors : cat === "Dermatology" ? issue.dermSpotterContributors : null;
              return (
                <section key={cat} id={cat.toLowerCase()} className="spot-group">
                  <h2>{cat} Spotters</h2>
                  <p className="muted">
                    {cat === "Radiology" ? "A case-based quiz on diagnostic imaging." : `A case-based quiz featuring clinical images in ${cat}.`}
                    {by ? <> Contributed by {by}</> : null}
                  </p>
                  {group.map((c) => <SpotterCaseCard key={c.id} caseNo={c.caseNo} category={c.category} options={c.options} imageUrl={c.imageUrl} images={c.images} question={c.question} diagnosis={c.diagnosis} findings={c.findings} />)}
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
