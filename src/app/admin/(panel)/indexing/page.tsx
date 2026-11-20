import Link from "next/link";
import { baseUrl, getJournalConfig, getPolicies } from "@/lib/journal-config";
import { publishedArticles, publishedIssues } from "@/lib/indexing/data";
import { planDois } from "@/lib/indexing/exports";
import { issueLabel } from "@/lib/format";
import { getCurrentIssue } from "@/lib/queries";
import { saveIssueDois } from "../../indexing-actions";

type Check = { ok: boolean | "warn"; label: string; detail?: React.ReactNode };

function Mark({ ok }: { ok: Check["ok"] }) {
  return ok === true ? <span className="check-mark check-mark--ok" aria-label="Done">✓</span>
    : ok === "warn" ? <span className="check-mark check-mark--warn" aria-label="Recommended">!</span>
      : <span className="check-mark check-mark--todo" aria-label="To do">✗</span>;
}

export default async function IndexingPage({ searchParams }: PageProps<"/admin/indexing">) {
  const sp = await searchParams;
  const [cfg, policies, rows, iss, current] = await Promise.all([getJournalConfig(), getPolicies(), publishedArticles(), publishedIssues(), getCurrentIssue()]);
  const site = baseUrl(cfg);
  const isLocal = !cfg.siteUrl || /localhost|127\.0\.0\.1/.test(cfg.siteUrl);
  const research = rows.map((r) => r.article);
  const missing = (f: (a: (typeof research)[number]) => boolean) => research.filter(f).length;
  const approved = policies.filter((p) => p.approved).length;
  const n = research.length;

  const checks: Check[] = [
    { ok: !isLocal, label: "Public website address", detail: isLocal ? "Not set yet. Add the live address in Journal settings once the site is online. Indexers can't reach a site that only runs on this computer." : cfg.siteUrl },
    { ok: !!(cfg.issnPrint || cfg.issnOnline), label: "ISSN", detail: cfg.issnPrint || cfg.issnOnline ? [cfg.issnPrint && `Print ${cfg.issnPrint}`, cfg.issnOnline && `Online ${cfg.issnOnline}`].filter(Boolean).join(" · ") : "Needed by Crossref, DOAJ, Index Copernicus, Scopus and most others." },
    { ok: true, label: "Open access licence", detail: cfg.licence },
    { ok: cfg.doiPrefix ? true : "warn", label: "DOI prefix (Crossref)", detail: cfg.doiPrefix || "Needed to give articles DOIs." },
    { ok: cfg.editorInChief ? true : "warn", label: "Editor-in-Chief named", detail: cfg.editorInChief || "Add in Journal settings." },
    { ok: approved === policies.length ? true : "warn", label: "Policy pages approved by the editors", detail: <><Link href="/admin/policies">{approved} of {policies.length} approved</Link>. Drafts are already on the site; please review them.</> },
    { ok: current?.editorialBoard.length ? true : false, label: "Editorial board published", detail: current?.editorialBoard.length ? <Link href="/editorial-board" target="_blank">View ↗</Link> : "Add the masthead to the current issue." },
    { ok: cfg.googleVerification ? true : "warn", label: "Google Search Console verified", detail: cfg.googleVerification ? "Code added" : "Add the verification code in Journal settings after the site is live." },
    { ok: missing((a) => !a.abstract.length) === 0 ? true : "warn", label: "Every article has an abstract", detail: `${missing((a) => !a.abstract.length)} of ${n} missing` },
    { ok: missing((a) => !a.keywords.length) === 0 ? true : "warn", label: "Every article has keywords", detail: `${missing((a) => !a.keywords.length)} of ${n} missing` },
    { ok: missing((a) => !a.affiliations.length) === 0 ? true : "warn", label: "Every article has author affiliations", detail: `${missing((a) => !a.affiliations.length)} of ${n} missing` },
    { ok: missing((a) => !a.pageStart) === 0 ? true : "warn", label: "Every article has page numbers", detail: `${missing((a) => !a.pageStart)} of ${n} missing` },
    { ok: missing((a) => !a.doi) === 0 ? true : "warn", label: "Every article has a DOI", detail: `${missing((a) => !a.doi)} of ${n} missing` },
  ];

  const sample = rows[0]?.article;
  const links = [
    { href: "/sitemap.xml", label: "Sitemap", note: "Submit this address in Google Search Console and Bing Webmaster Tools." },
    { href: "/robots.txt", label: "robots.txt", note: "Lets search engines crawl everything except the editor panel." },
    { href: "/feed.xml", label: "RSS feed", note: "Latest articles, for JournalTOCs, Feedly and similar." },
    { href: "/oai?verb=Identify", label: "OAI-PMH", note: "Give the base address to DOAJ, BASE, CORE, OpenAIRE and library harvesters." },
    { href: "/oai?verb=ListRecords&metadataPrefix=oai_dc", label: "OAI-PMH records (Dublin Core)", note: "What harvesters will collect." },
    ...(sample ? [{ href: `/article/${sample.slug}/jats`, label: "Sample JATS XML", note: "Every article has one: add /jats to its address." }] : []),
  ];

  return (
    <>
      <div className="admin-head">
        <h1>Indexing</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn btn--ghost" href="/admin/policies">Policy pages</Link>
          <Link className="btn btn--primary" href="/admin/settings">Journal settings</Link>
        </div>
      </div>
      {sp.doisSaved ? <div className="alert alert--ok" role="status">{String(sp.doisSaved)} DOIs saved to articles.</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20 }}>
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem" }}>Readiness checklist</h2>
          <ul className="check-list">
            {checks.map((c) => <li key={c.label}><Mark ok={c.ok} /><div><strong>{c.label}</strong>{c.detail ? <div className="muted" style={{ fontSize: ".85rem" }}>{c.detail}</div> : null}</div></li>)}
          </ul>
        </div>
        <div className="panel">
          <h2 style={{ fontSize: "1.1rem" }}>Addresses to give indexing services</h2>
          <p className="muted" style={{ fontSize: ".85rem" }}>These are built automatically and always up to date. They start with {site}.</p>
          <ul className="check-list">
            {links.map((l) => <li key={l.href}><span className="check-mark check-mark--ok">↗</span><div><a href={l.href} target="_blank" rel="noopener"><strong>{l.label}</strong></a><div className="muted" style={{ fontSize: ".85rem" }}>{site}{l.href.split("?")[0]} · {l.note}</div></div></li>)}
          </ul>
          <p className="muted" style={{ fontSize: ".85rem", marginTop: 12 }}>
            Every article page also carries Google Scholar (Highwire), Dublin Core, PRISM and schema.org tags, and offers RIS, BibTeX and JATS downloads.
          </p>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ fontSize: "1.1rem" }}>Files for each issue</h2>
        <p className="muted" style={{ fontSize: ".88rem", maxWidth: 820 }}>
          <strong>Crossref XML</strong> registers DOIs: upload it at Crossref (web deposit form) after the publisher has joined Crossref.
          Articles without a DOI get one made from the DOI pattern in Journal settings. Once Crossref confirms the deposit,
          press <strong>Save DOIs to articles</strong> so the DOIs appear on the site. <strong>DOAJ XML</strong> is uploaded
          in the DOAJ publisher dashboard after the journal is accepted.
        </p>
        <table className="table">
          <thead><tr><th>Issue</th><th>Articles</th><th>DOIs</th><th>Downloads</th><th /></tr></thead>
          <tbody>
            {iss.map((i) => {
              const list = rows.filter((r) => r.issue?.id === i.id).map((r) => r.article);
              const plan = planDois(i, list, cfg);
              const have = plan.filter((p) => p.existing).length;
              const canSave = plan.some((p) => !p.existing && p.doi);
              return (
                <tr key={i.id} id={`issue-${i.slug}`}>
                  <td><Link href={`/issue/${i.slug}`} target="_blank">{issueLabel(i)}</Link></td>
                  <td>{list.length}</td>
                  <td>{have} of {list.length}{plan[0] && !plan[0].existing && plan[0].doi ? <div className="muted" style={{ fontSize: ".78rem" }}>e.g. {plan[0].doi}</div> : null}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <a className="btn btn--ghost btn--sm" href={`/admin/indexing/crossref/${i.slug}`}>Crossref XML</a>{" "}
                    <a className="btn btn--ghost btn--sm" href={`/admin/indexing/doaj/${i.slug}`}>DOAJ XML</a>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canSave ? (
                      <form action={saveIssueDois}>
                        <input type="hidden" name="issue" value={i.slug} />
                        <button className="btn btn--ghost btn--sm" title="Only after Crossref has accepted the deposit">Save DOIs to articles</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 style={{ fontSize: "1.1rem" }}>Steps only the journal can take</h2>
        <ol style={{ display: "grid", gap: 8, paddingLeft: 20 }}>
          <li><strong>Put the site online</strong> at a permanent address (ideally on the kimshealth.org domain) and enter it in Journal settings.</li>
          <li><strong>ISSN</strong>: apply to the ISSN National Centre for India (CSIR-NIScPR, New Delhi) for a print ISSN and a separate e-ISSN for the website. See <a href="https://www.issn.org/" target="_blank" rel="noopener">issn.org</a>.</li>
          <li><strong>Google Scholar</strong>: no application is needed. Once the site is live, add it to <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Google Search Console</a>, paste the verification code into Journal settings and submit the sitemap. Scholar usually picks articles up within a few weeks.</li>
          <li><strong>Crossref (DOIs)</strong>: join <a href="https://www.crossref.org/membership/" target="_blank" rel="noopener">Crossref</a> as a member (annual fee plus a small fee per DOI), then enter the DOI prefix here and upload the Crossref XML for each issue.</li>
          <li><strong>DOAJ</strong>: apply at <a href="https://doaj.org/apply/" target="_blank" rel="noopener">doaj.org</a> once the policy pages are approved and the ISSN is on the site. DOAJ asks for the policy page addresses listed under Policy pages.</li>
          <li><strong>Index Copernicus</strong>: register the journal in the <a href="https://journals.indexcopernicus.com/" target="_blank" rel="noopener">ICI Journals Master List</a> and complete the evaluation form.</li>
          <li><strong>Others</strong> (Scopus, Embase, EBSCO, J-Gate, PubMed Central): each has its own application. Most expect a few years of regular, on-time issues, an ISSN, DOIs and the policies above. The OAI-PMH address and JATS files are what they will ask for technically.</li>
        </ol>
      </div>
    </>
  );
}
