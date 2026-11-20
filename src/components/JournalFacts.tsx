import Link from "next/link";
import { getJournalConfig, getPolicies, licenceOf } from "@/lib/journal-config";

/** Side panel on the about and policy pages: key journal facts and the list of policies. */
export default async function JournalFacts({ current }: { current?: string }) {
  const [cfg, policies] = await Promise.all([getJournalConfig(), getPolicies()]);
  const lic = licenceOf(cfg);
  return (
    <aside>
      <div className="side-box">
        <h3>Journal information</h3>
        <dl className="journal-facts">
          <dt>Publisher</dt><dd>{cfg.publisher}, {cfg.country}</dd>
          {cfg.editorInChief ? <><dt>Editor-in-Chief</dt><dd>{cfg.editorInChief}</dd></> : null}
          {cfg.issnPrint ? <><dt>ISSN (print)</dt><dd>{cfg.issnPrint}</dd></> : null}
          {cfg.issnOnline ? <><dt>e-ISSN</dt><dd>{cfg.issnOnline}</dd></> : null}
          <dt>Frequency</dt><dd>{cfg.frequency}</dd>
          <dt>Access</dt><dd>Open access</dd>
          <dt>Licence</dt><dd><a href={lic.url} target="_blank" rel="license noopener">{lic.short}</a></dd>
          <dt>Review</dt><dd><Link href="/policies/peer-review">Peer reviewed</Link></dd>
          <dt>Contact</dt><dd><a href={`mailto:${cfg.contactEmail}`}>{cfg.contactEmail}</a></dd>
        </dl>
      </div>
      <div className="side-box policy-side">
        <h3>Journal policies</h3>
        <Link href="/editorial-board" aria-current={current === "editorial-board" ? "page" : undefined}>Editorial board</Link>
        {policies.map((p) => (
          <Link key={p.slug} href={`/policies/${p.slug}`} aria-current={current === p.slug ? "page" : undefined}>{p.title}</Link>
        ))}
        <Link href="/contact" aria-current={current === "contact" ? "page" : undefined}>Contact</Link>
      </div>
    </aside>
  );
}
