// The journal policy pages that indexing services (DOAJ, Scopus, Index
// Copernicus, ICMJE, COPE) look for. These are templated drafts: editors
// review and edit them in Editor panel > Policy pages and mark each approved.
// Text uses a light markup (see renderPolicy) and {{placeholders}} that are
// filled from Journal settings (see fillPolicy in journal-config.ts).

export type PolicyDef = {
  slug: string;
  title: string;
  /** One line shown in lists. */
  summary: string;
  body: string;
  /** What the editors must check before approving. */
  checks: string[];
};

export const DEFAULT_POLICIES: PolicyDef[] = [
  {
    slug: "author-guidelines",
    title: "Author guidelines",
    summary: "How to prepare and submit a manuscript.",
    checks: ["Word limits and the number of figures, tables and references for each article type", "How manuscripts are submitted (website form, email or both)"],
    body: `{{journal}} welcomes original work from clinicians, nurses, pharmacists, allied health professionals and researchers. Manuscripts are considered on the understanding that they have not been published before and are not under consideration elsewhere.

## Article types
- **Original Research**: prospective and retrospective studies, clinical trials, audits and quality-improvement projects.
- **Case Reports** and **Case Series**: unusual presentations, diagnostic challenges and novel management.
- **Review Articles** and **Clinical Reviews**: evidence-based overviews of a clinical topic.
- **Images in Medicine**, **Short Communications**, **Editorials** and **Letters to the Editor**.

## Preparing the manuscript
Manuscripts should follow the ICMJE [Recommendations for the Conduct, Reporting, Editing and Publication of Scholarly Work in Medical Journals](https://www.icmje.org/recommendations/).
- **Title page**: title, the full name and affiliation of every author, and one corresponding author with postal address and email. Authors are encouraged to give their ORCID iD.
- **Abstract**: structured for original research (Background, Methods, Results, Conclusion); unstructured for case reports and reviews.
- **Keywords**: three to seven, preferably from MeSH.
- **Main text**: original research should have Introduction, Methods, Results, Discussion and Conclusion. Case reports should have Introduction, Case presentation, Discussion and Conclusion.
- **Reporting guidelines**: follow the relevant [EQUATOR Network](https://www.equator-network.org/) checklist, for example CONSORT for trials, STROBE for observational studies, CARE for case reports and PRISMA for systematic reviews.
- **References**: numbered in the order they are cited, in Vancouver style, with a DOI or PMID wherever one exists.
- **Figures and tables**: numbered, with captions, and cited in the text. Figures as high-resolution JPG or PNG. Remove anything that could identify a patient.

## Declarations
Every manuscript must include statements on ethics committee approval, informed consent, conflicts of interest, funding and author contributions. See the [Publication ethics](/policies/publication-ethics) policy.

## Submission
Submit through the [manuscript submission form](/submit) or by email to {{email}}. The corresponding author receives an acknowledgement and is kept informed during review.

## After acceptance
Accepted articles are copy-edited and typeset. The corresponding author is sent proofs to check before publication. Articles are published under the {{licence}}. See [Open access and licensing](/policies/open-access).`,
  },
  {
    slug: "peer-review",
    title: "Peer review policy",
    summary: "How manuscripts are assessed and decided.",
    checks: ["Single-blind or double-blind review", "How many reviewers each manuscript gets", "Typical time to first decision"],
    body: `All research articles, case reports and reviews published in {{journal}} are peer reviewed.

## Process
1. **Initial check**: the editorial office checks each submission for scope, completeness, adherence to the author guidelines and similarity with published work.
2. **Editorial assessment**: the Editor-in-Chief or a handling editor decides whether the manuscript is sent for review. Manuscripts that are out of scope or not of sufficient quality may be declined without review.
3. **Peer review**: the manuscript is sent to at least two independent reviewers with expertise in the subject. Review is double-blind: reviewers do not know the identity of the authors, and authors do not know the identity of the reviewers.
4. **Decision**: based on the reviews, the editor accepts, requests minor or major revision, or rejects the manuscript. Revised manuscripts may be sent back to the reviewers.
5. **Final decision**: the Editor-in-Chief makes the final decision on publication.

## Reviewers
Reviewers are asked to declare any conflict of interest and to decline if they cannot judge the work impartially. Manuscripts and reviews are confidential and may not be shared or used for any other purpose. Reviewers are guided by the [COPE Ethical Guidelines for Peer Reviewers](https://publicationethics.org/guidance/guideline/ethical-guidelines-peer-reviewers).

## Editorial and in-house submissions
Manuscripts authored by an editor or editorial board member are handled by another editor, and the author takes no part in the decision.

## Editorials and educational features
Editorials, Pharma Updates, Spotters and Scramble are commissioned by the editors and are reviewed by the editorial team rather than external reviewers.

## Appeals
Authors may appeal a decision by writing to {{email}} with a reasoned case. Appeals are considered by an editor who was not involved in the original decision.`,
  },
  {
    slug: "publication-ethics",
    title: "Publication ethics",
    summary: "Ethics, consent, authorship, conflicts of interest, misconduct and corrections.",
    checks: ["That the journal follows COPE and ICMJE (and whether it is a COPE member)", "The similarity-check tool used, if any"],
    body: `{{journal}} follows the guidance of the [Committee on Publication Ethics (COPE)](https://publicationethics.org/) and the [ICMJE Recommendations](https://www.icmje.org/recommendations/). Authors, reviewers and editors are expected to meet these standards.

## Ethics approval and consent
- Research involving human participants, their data or tissue must have been approved by an institutional ethics committee, and must conform to the Declaration of Helsinki. The approval reference should be stated in the manuscript.
- Informed consent must be obtained from participants. For case reports and images, written consent for publication must be obtained from the patient or their legal guardian.
- Research involving animals must follow institutional and national guidelines.
- Clinical trials should be registered in a public registry, such as the Clinical Trials Registry of India (CTRI), before the first participant is enrolled.

## Authorship
Authorship follows the ICMJE criteria. Every author must have contributed substantially to the work, taken part in drafting or revising it, approved the final version, and agreed to be accountable for it. Others who helped should be named in the acknowledgements. Changes to the author list after submission need the written agreement of all authors.

## Conflicts of interest and funding
All authors, reviewers and editors must declare any financial or personal relationships that could be seen to influence their work. All sources of funding must be declared in the manuscript.

## Plagiarism and duplicate publication
Submissions may be checked for similarity with published work. Plagiarism, duplicate or redundant publication, and data fabrication or falsification are not accepted.

## Use of AI tools
Generative AI tools cannot be listed as authors. Authors who use such tools for writing or analysis must say so in the manuscript and remain responsible for its content.

## Handling of misconduct
Concerns about possible misconduct in submitted or published work are investigated by the editors following the COPE flowcharts. Concerns can be raised in confidence with {{email}}.

## Corrections, retractions and expressions of concern
Errors found after publication are corrected by a published correction linked to the article. Articles found to be seriously flawed or the result of misconduct are retracted following the [COPE Retraction Guidelines](https://publicationethics.org/guidance/guideline/retraction-guidelines); the article stays online, clearly marked as retracted, with a notice giving the reason. Where an investigation is ongoing, the editors may publish an expression of concern.

## Advertising and sponsorship
Editorial decisions are independent of any advertising, sponsorship or commercial interest.`,
  },
  {
    slug: "open-access",
    title: "Open access and licensing",
    summary: "Free access, the licence for reuse, copyright and author fees.",
    checks: ["The licence chosen in Journal settings", "Who keeps copyright", "The author fees statement"],
    body: `{{journal}} is an open access journal. All articles are free to read, download, print and share immediately on publication, without registration or subscription, in line with the [Budapest Open Access Initiative](https://www.budapestopenaccessinitiative.org/) definition of open access.

## Licence
Articles are published under the [{{licence}}]({{licenceUrl}}). Readers may copy and redistribute the material in any medium or format, and adapt it, within the terms of the licence, provided the original work is properly cited.

## Copyright
Copyright of each article is held by {{copyright}}. Authors grant the journal the right to publish the article first, and to include it in indexing services and archives.

## Author fees
{{fees}}

## Self-archiving
Authors may deposit the published version of their article in an institutional or subject repository, or on a personal website, with a link to the article on this site.

## Machine-readable metadata
Article metadata is available to indexing services and the public through an [OAI-PMH interface](/oai?verb=Identify), an [RSS feed](/feed.xml) and per-article JATS XML, RIS and BibTeX downloads.`,
  },
  {
    slug: "archiving",
    title: "Archiving and preservation",
    summary: "How published content is preserved.",
    checks: ["Where print copies are kept", "Any digital preservation service the journal has joined (e.g. PKP PN, CLOCKSS, Portico), or remove that sentence"],
    body: `{{publisher}} is committed to keeping everything published in {{journal}} permanently available.

- Every published issue is kept as printed copies by {{publisher}} and is available on this website as full text and as page images of the printed issue.
- The website and its database are backed up regularly.
- Article metadata is openly available through the journal's [OAI-PMH interface](/oai?verb=Identify) so that libraries and aggregators can harvest it.
- Authors may also deposit their published articles in institutional and subject repositories (see [Open access and licensing](/policies/open-access)).

The journal intends to join a recognised digital preservation service, such as CLOCKSS, Portico or the PKP Preservation Network, and will list it here once it has.`,
  },
  {
    slug: "privacy",
    title: "Privacy statement",
    summary: "How personal information is used.",
    checks: ["That the website keeps no analytics or advertising cookies (update if any are added)"],
    body: `The names, affiliations and email addresses entered on this site or sent to the journal are used only for the journal's stated purposes, such as handling submissions and publishing articles. They are not sold or passed on to any other party.

## Authors
The names and affiliations of authors, and the email address of the corresponding author, are published with each article and shared with indexing services as part of the article's metadata.

## Patients
Manuscripts must not contain information that could identify a patient unless the patient has given written consent for publication.

## Cookies
This website uses a cookie only to keep editors signed in to the editor panel. It does not use advertising or tracking cookies.

## Contact
Questions about personal data can be sent to {{email}}.`,
  },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineMd(s: string) {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    const safe = /^(https?:|mailto:|\/)/.test(href) ? href : "#";
    const ext = /^https?:/.test(safe);
    return `<a href="${safe}"${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
  });
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "<em>$1</em>");
  out = out.replace(/\b([\w.+-]+@[\w-]+(?:\.[\w-]+)+)\b(?![^<]*<\/a>)/g, '<a href="mailto:$1">$1</a>');
  return out;
}

/** Turns policy markup into HTML: ## heading, ### subheading, - bullets, 1. numbered, **bold**, *italic*, [text](link). */
export function renderPolicy(md: string) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(" "))}</p>`); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = ln.match(/^(#{2,3})\s+(.+)$/))) {
      flush();
      const tag = m[1].length === 2 ? "h2" : "h3";
      const id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<${tag} id="${id}">${inlineMd(m[2])}</${tag}>`);
    } else if (/^[-*]\s+/.test(ln) || /^\d+[.)]\s+/.test(ln)) {
      flush();
      const ordered = /^\d/.test(ln);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/).test(lines[i].trim())) {
        items.push(`<li>${inlineMd(lines[i].trim().replace(/^([-*]|\d+[.)])\s+/, ""))}</li>`);
        i++;
      }
      i--;
      out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
    } else {
      para.push(ln);
    }
  }
  flush();
  return out.join("\n");
}

/** Plain text of policy markup (for meta descriptions). */
export function policyText(md: string) {
  return md.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*]/g, "").replace(/\s+/g, " ").trim();
}
