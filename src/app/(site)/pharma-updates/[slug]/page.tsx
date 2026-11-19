import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import { getPharmaUpdate, issuesById } from "@/lib/queries";
import { excerpt, issueLabel } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/pharma-updates/[slug]">): Promise<Metadata> {
  const p = await getPharmaUpdate((await params).slug);
  return p ? { title: p.title, description: excerpt(p.summary, 160) } : { title: "Not found" };
}

export default async function PharmaDetail({ params }: PageProps<"/pharma-updates/[slug]">) {
  const p = await getPharmaUpdate((await params).slug);
  if (!p) notFound();
  const issue = p.issueId ? (await issuesById([p.issueId])).get(p.issueId) : null;
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><Link href="/pharma-updates">Pharma Updates</Link></div>
          <span className="eyebrow">Pharma Update{issue ? ` · ${issueLabel(issue)}` : ""}</span>
          <h1 style={{ maxWidth: 900 }}>{p.title}</h1>
          <ShareButton path={`/pharma-updates/${p.slug}`} title={p.title} className="btn btn--ghost btn--sm" />
        </div>
      </div>
      <div className="container section">
        <div className="prose">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt="" style={{ borderRadius: 10, marginBottom: 24 }} />
          ) : null}
          {p.bodyHtml ? <div dangerouslySetInnerHTML={{ __html: p.bodyHtml }} /> : <p>{p.summary}</p>}
          <p><Link href="/pharma-updates">← All pharma updates</Link></p>
        </div>
      </div>
    </>
  );
}
