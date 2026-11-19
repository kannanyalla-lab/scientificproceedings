// Turns an uploaded edition PDF into a ready-to-publish edition.
// Started by the editor panel (Import edition) as a separate process:
//   tsx scripts/import-worker.ts <import id>
// It can also be run by hand to retry an import. Finished steps are cached in
// .data/imports/<id>/steps, so a retry carries on where the last run stopped.
import "dotenv/config";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analysePdf, cropImage, openPdf, renderPage, shrink } from "../src/lib/importer/pdf";
import {
  DEFAULT_MODEL, extractArticle, extractFeatures, imageBlock, pageLabel, planEdition, textBlock,
  type ArticleOut, type Content, type FeaturesOut, type Plan, type Usage,
} from "../src/lib/importer/claude";
import { blocksToHtml, plain, slugify, unlinkMissingRefs } from "../src/lib/importer/markup";
import {
  assetFolder, assetUrl, getApiKey, jobDir, loadStep, readStatus, saveResult, saveStep, sourcePath, writeStatus,
} from "../src/lib/importer/jobs";

const id = process.argv[2];
const MODEL = process.env.KSP_IMPORT_MODEL || DEFAULT_MODEL;
const PAGE_WIDTH = 1240; // page images shown on the site
const HIRES_WIDTH = 2000; // used for cropping figures
const CONCURRENCY = Number(process.env.KSP_IMPORT_CONCURRENCY || 3);
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

const warnings: string[] = [];
let usage: Usage = { input: 0, output: 0 };

async function status(step: string, progress: number) {
  console.log(`[${progress}%] ${step}`);
  await writeStatus(id, { state: "running", step, progress, usage, warnings, pid: process.pid, model: MODEL });
}

/** Runs fn over items, a few at a time. */
async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

async function main() {
  if (!id) throw new Error("Usage: tsx scripts/import-worker.ts <import id>");
  const prev = await readStatus(id);
  if (!prev) throw new Error(`No import ${id}`);
  usage = prev.usage ?? usage;
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No Claude API key is set. Add it on the Import edition page in the editor panel.");

  // Keep the status fresh while a long step runs, so the page can tell a slow step from a stopped one.
  const beat = setInterval(() => { writeStatus(id, { usage }).catch(() => {}); }, 30_000);
  try {
    await run(apiKey);
  } finally {
    clearInterval(beat);
  }
}

async function run(apiKey: string) {
  /* 1. Read and render the pages */
  await status("Reading the PDF", 2);
  const doc = await openPdf(new Uint8Array(await readFile(sourcePath(id))));
  const pages = await analysePdf(doc);
  const N = pages.length;
  const assets = assetFolder(id);
  const hiresDir = path.join(jobDir(id), "hires");
  await mkdir(path.join(assets, "pages"), { recursive: true });
  await mkdir(path.join(assets, "fig"), { recursive: true });
  await mkdir(hiresDir, { recursive: true });
  await writeStatus(id, { pages: N });

  const hiresPath = (n: number) => path.join(hiresDir, `${pad(n, 3)}.jpg`);
  for (const p of pages) {
    if (!existsSync(hiresPath(p.n))) {
      const hi = await renderPage(doc, p.n, HIRES_WIDTH, 90);
      await writeFile(hiresPath(p.n), hi);
      await writeFile(path.join(assets, "pages", `${pad(p.n)}.jpg`), await shrink(hi, Math.round(PAGE_WIDTH * Math.max(1, p.height / p.width)), 80));
    }
    if (p.n % 4 === 0 || p.n === N) await status(`Making page images (${p.n} of ${N})`, 2 + Math.round((p.n / N) * 13));
  }
  const hires = (n: number) => readFile(hiresPath(n));
  const forClaude = async (n: number, max: number) => shrink(await hires(n), max, 78);
  const scannedPages = pages.filter((p) => p.scanned).length;
  if (scannedPages > N / 2) warnings.push(`Most pages are scanned images without a text layer (${scannedPages} of ${N}). Text was read from the images, so check spellings carefully.`);

  /* 2. Work out the structure */
  let plan = await loadStep<Plan>(id, "plan");
  if (!plan) {
    await status("Finding the articles and sections", 17);
    const content: Content = [];
    let images = 0;
    for (const p of pages) {
      const sparse = p.scanned || p.text.replace(/\s/g, "").length < 400;
      content.push(textBlock(pageLabel(p, true, 4000)));
      if ((p.n <= 6 || sparse) && images < 90) { content.push(imageBlock(await forClaude(p.n, 1000))); images++; }
    }
    plan = await planEdition(apiKey, MODEL, content, usage);
    await saveStep(id, "plan", plan);
  }
  if (!plan.articles.length) throw new Error("No articles were found in this PDF. Is it an edition of Scientific Proceedings?");
  const clamp = (n: number) => Math.min(N, Math.max(1, n));

  /* 3. Transcribe each article */
  let done = 0;
  await status(`Reading articles (0 of ${plan.articles.length})`, 22);
  const arts = await pool(plan.articles, CONCURRENCY, async (hint, i) => {
    const key = `article-${pad(i + 1)}`;
    let a = await loadStep<ArticleOut>(id, key);
    if (!a) {
      const from = clamp(hint.pdfStart), to = clamp(Math.max(hint.pdfEnd, hint.pdfStart));
      const content: Content = [];
      for (let n = from; n <= Math.min(to, from + 24); n++) {
        content.push(textBlock(pageLabel(pages[n - 1])));
        content.push(imageBlock(await forClaude(n, 1568)));
      }
      try {
        a = await extractArticle(apiKey, MODEL, content, hint, usage);
        await saveStep(id, key, a);
      } catch (e) {
        warnings.push(`"${hint.title}" could not be read (${(e as Error).message}). It was left out; you can add it by hand in Articles.`);
        a = null;
      }
    }
    done++;
    await status(`Reading articles (${done} of ${plan!.articles.length})`, 22 + Math.round((done / plan!.articles.length) * 58));
    return a ? { a, hint } : null;
  });

  /* 4. Pharma Updates, Spotters and Scramble */
  const fp = plan.featurePages;
  const featurePages = [...new Set([...fp.pharma, ...fp.radiologySpotters, ...fp.dermatologySpotters, ...fp.scramble, ...fp.answers].map(clamp))].sort((a, b) => a - b);
  let features: FeaturesOut = { pharma: [], spotters: [], scramble: [] };
  if (featurePages.length) {
    const cached = await loadStep<FeaturesOut>(id, "features");
    if (cached) features = cached;
    else {
      await status("Reading Pharma Updates, Spotters and Scramble", 82);
      const content: Content = [];
      for (const n of featurePages.slice(0, 30)) {
        content.push(textBlock(pageLabel(pages[n - 1])));
        content.push(imageBlock(await forClaude(n, 1568)));
      }
      try {
        features = await extractFeatures(apiKey, MODEL, content, usage);
        await saveStep(id, "features", features);
      } catch (e) {
        warnings.push(`Pharma Updates, Spotters and Scramble could not be read (${(e as Error).message}). Add them by hand if needed.`);
      }
    }
  }

  /* 5. Cut out figures and build the edition */
  await status("Cutting out figures and putting the edition together", 90);
  const figCache = new Map<string, Promise<string | null>>();
  const pageById = new Map(pages.map((p) => [p.n, p]));
  const cutFigure = (ref: string, prefix: string, context: string): Promise<string | null> => {
    const k = ref.trim();
    if (!figCache.has(k)) {
      figCache.set(k, (async () => {
        let n: number, box: { x0: number; y0: number; x1: number; y1: number } | undefined;
        const idm = k.match(/^p(\d+)i(\d+)$/);
        const crop = k.match(/^p(\d+)@([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)$/);
        if (idm) { n = Number(idm[1]); box = pageById.get(n)?.images.find((im) => im.id === k); }
        else if (crop) {
          n = Number(crop[1]);
          const [x0, y0, x1, y1] = crop.slice(2).map(Number);
          if (x1 > x0 && y1 > y0 && x0 >= 0 && y1 <= 1.001) box = { x0, y0, x1: Math.min(1, x1), y1: Math.min(1, y1) };
        } else n = 0;
        if (!box || !pageById.has(n)) { warnings.push(`A figure in ${context} could not be found on the page (${k}). Add the image by hand.`); return null; }
        const file = `fig/${prefix}-${k.replace(/[^\w]+/g, "_")}.jpg`;
        await writeFile(path.join(assetFolder(id), file), await cropImage(await hires(n), box));
        return assetUrl(id, file);
      })());
    }
    return figCache.get(k)!;
  };
  /** Cuts every figure a markup text refers to, then returns a resolver for blocksToHtml. */
  const resolverFor = async (texts: string[], prefix: string, context: string) => {
    const refs = new Set<string>();
    for (const t of texts) for (const m of t.matchAll(/^!fig\s+([^|]+)/gm)) m[1].split(",").map((x) => x.trim()).filter(Boolean).forEach((r) => refs.add(r));
    const urls = new Map<string, string | null>();
    for (const r of refs) urls.set(r, await cutFigure(r, prefix, context));
    return (r: string) => urls.get(r.trim()) ?? null;
  };

  const articles = [];
  for (const [i, item] of arts.entries()) {
    if (!item) continue;
    const { a, hint } = item;
    const prefix = `a${pad(i + 1)}`;
    const fig = await resolverFor([a.body, a.notes], prefix, `"${a.title}"`);
    const figs: string[] = [];
    let bodyHtml = blocksToHtml(a.body.split("\n"), fig, figs);
    let notesHtml = a.notes.trim() ? blocksToHtml(a.notes.split("\n"), fig, figs) : null;
    bodyHtml = unlinkMissingRefs(bodyHtml, a.refs.length);
    if (notesHtml) notesHtml = unlinkMissingRefs(notesHtml, a.refs.length);
    let imageUrl: string | null = null;
    if (a.mainImage.trim()) imageUrl = (await cutFigure(a.mainImage.trim(), prefix, `"${a.title}"`)) ?? null;
    if (!a.body.trim()) warnings.push(`"${a.title}" has no body text. Check it before publishing.`);
    if (!a.refs.length && a.articleType !== "Editorial") warnings.push(`"${a.title}" has no references.`);
    articles.push({
      title: a.title.trim() || hint.title,
      articleType: a.articleType || hint.articleType,
      authors: a.authors.map((x) => (x.aff.trim() ? { name: x.name.trim(), aff: x.aff.trim() } : { name: x.name.trim() })),
      affiliations: a.affiliations.filter((x) => x.text.trim()).sort((x, y) => x.key.localeCompare(y.key, undefined, { numeric: true })),
      correspondingAuthor: a.correspondingAuthor.trim() || null,
      correspondingEmail: a.correspondingEmail.trim() || null,
      keywords: a.keywords.map((k) => k.trim()).filter(Boolean),
      abstract: a.abstract.filter((s) => s.text.trim()).map((s) => ({ heading: s.heading.trim(), text: plain(s.text) })),
      bodyHtml,
      notesHtml,
      refs: a.refs.map((r) => r.replace(/^\s*\[?\d+[.\])]\s*/, "").trim()).filter(Boolean),
      pageStart: a.printedStart || hint.printedStart || "",
      pageEnd: a.printedEnd || hint.printedEnd || a.printedStart || hint.printedStart || "",
      doi: a.doi.trim() || null,
      imageUrl: imageUrl ?? figs[0] ?? null,
      featured: false,
      sortOrder: i,
    });
  }

  const pharma = [];
  for (const [i, p] of features.pharma.entries()) {
    const fig = await resolverFor([p.body], `ph${i + 1}`, `Pharma Update "${p.title}"`);
    pharma.push({
      slug: slugify(p.title),
      title: p.title.trim(),
      summary: plain(p.summary),
      bodyHtml: blocksToHtml(p.body.split("\n"), fig),
      imageUrl: p.image.trim() ? await cutFigure(p.image.trim(), `ph${i + 1}`, `Pharma Update "${p.title}"`) : null,
      refs: p.refs.map((r) => r.replace(/^\s*\[?\d+[.\])]\s*/, "").trim()).filter(Boolean),
      sortOrder: i,
    });
  }
  const spotters = [];
  for (const s of features.spotters) {
    const imgs = (await Promise.all(s.images.map((r) => cutFigure(r, `sp-${s.category[0].toLowerCase()}${s.caseNo}`, `${s.category} Spotter ${s.caseNo}`)))).filter((x): x is string => !!x);
    spotters.push({
      caseNo: s.caseNo, category: s.category, options: s.options, question: s.question.trim(),
      diagnosis: s.diagnosis.trim() || "Answer not printed", findings: s.findings.trim() || null,
      imageUrl: imgs[0] ?? null, images: imgs,
    });
  }
  const scramble = features.scramble.map((s, i) => ({ ...s, sortOrder: i }));

  // The original PDF becomes the issue's "Download full issue" file.
  await copyFile(sourcePath(id), path.join(assetFolder(id), "edition.pdf"));
  const slug = `${plan.month.toLowerCase()}-${plan.year}-volume-${plan.volume}-issue-${pad(plan.number)}`;
  const issue = {
    slug,
    volume: plan.volume, number: plan.number, month: plan.month, year: plan.year,
    coverUrl: assetUrl(id, "pages/01.jpg"),
    description: plan.description.trim() || null,
    highlights: plan.highlights.map((h) => h.trim()).filter(Boolean),
    editorialBoard: plan.editorialBoard.map((g) => ({ role: g.role, members: g.members.map((m) => (m.title.trim() ? { name: m.name, title: m.title } : { name: m.name })) })),
    pharmaContributors: plan.contributors.pharma.trim() || null,
    spotterContributors: plan.contributors.radiologySpotters.trim() || null,
    dermSpotterContributors: plan.contributors.dermatologySpotters.trim() || null,
    scrambleContributors: plan.contributors.scramble.trim() || null,
    pageImages: pages.map((p) => assetUrl(id, `pages/${pad(p.n)}.jpg`)),
    pageOffset: plan.pageOffset,
    pdfUrl: assetUrl(id, "edition.pdf"),
    isCurrent: true,
  };
  if (articles.length < plan.articles.length) warnings.push(`${plan.articles.length - articles.length} of ${plan.articles.length} articles could not be read.`);

  await saveResult(id, { issue, articles, pharma, spotters, scramble });
  await writeStatus(id, {
    state: "review", step: "Ready to review", progress: 100, usage, warnings,
    summary: { title: `${plan.month} ${plan.year} · Volume ${plan.volume}, Issue ${pad(plan.number)}`, slug, articles: articles.length, pharma: pharma.length, spotters: spotters.length, scramble: scramble.length },
  });
  console.log(`Done: ${articles.length} articles, ${pharma.length} pharma updates, ${spotters.length} spotters, ${scramble.length} scramble words.`);
}

main().then(() => process.exit(0)).catch(async (e) => {
  console.error(e);
  const msg = e instanceof Error ? e.message : String(e);
  const friendly = /authentication|api[_ -]?key|401/i.test(msg) ? "The Claude API key was not accepted. Check it on the Import edition page." :
    /credit balance|billing|402/i.test(msg) ? "Your Claude API account has run out of credit. Add credit at console.anthropic.com, then press Try again." : msg;
  if (id) await writeStatus(id, { state: "failed", step: "Stopped", error: friendly, usage, warnings }).catch(() => {});
  process.exit(1);
});
