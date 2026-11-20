"use server";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { articles, issues } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_CONFIG, getJournalConfig, LICENCES, savePolicy, writeSetting, type JournalConfig } from "@/lib/journal-config";
import { DEFAULT_POLICIES } from "@/lib/policies";
import { getIssueArticles } from "@/lib/queries";
import { planDois } from "@/lib/indexing/exports";

const ISSN = /^\d{4}-\d{3}[\dX]$/;

function issnOk(v: string) {
  if (!ISSN.test(v)) return false;
  const d = v.replace("-", "");
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(d[i]) * (8 - i);
  const check = (11 - (sum % 11)) % 11;
  return (check === 10 ? "X" : String(check)) === d[7];
}

export async function saveJournalSettings(form: FormData) {
  await requireAdmin();
  const out: Partial<JournalConfig> = {};
  for (const k of Object.keys(DEFAULT_CONFIG) as (keyof JournalConfig)[]) {
    const v = form.get(k);
    if (typeof v === "string") out[k] = v.trim();
  }
  const errors: string[] = [];
  const bad: (keyof JournalConfig)[] = [];
  const fail = (k: keyof JournalConfig, msg: string) => { bad.push(k); errors.push(msg); };
  for (const k of ["issnPrint", "issnOnline"] as const) {
    const v = (out[k] || "").toUpperCase().replace(/\s/g, "");
    out[k] = v;
    if (v && !issnOk(v)) fail(k, `${k === "issnPrint" ? "Print ISSN" : "Online ISSN"} "${v}" is not a valid ISSN (format 1234-567X, with a correct check digit).`);
  }
  if (out.doiPrefix) {
    out.doiPrefix = out.doiPrefix.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/\/+$/, "");
    if (!/^10\.\d{4,9}$/.test(out.doiPrefix)) fail("doiPrefix", `DOI prefix "${out.doiPrefix}" should look like 10.12345.`);
  }
  if (out.siteUrl) {
    out.siteUrl = out.siteUrl.replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s/]+/.test(out.siteUrl)) fail("siteUrl", "The public website address must start with https://");
  }
  if (out.licence && !LICENCES[out.licence]) out.licence = DEFAULT_CONFIG.licence;
  for (const k of ["googleVerification", "bingVerification"] as const) {
    // Accept the whole <meta> tag pasted by mistake.
    const m = (out[k] || "").match(/content="([^"]+)"/);
    if (m) out[k] = m[1];
  }
  if (errors.length) {
    // Keep everything else that was typed; only the boxes with a problem keep their old value.
    const prev = await getJournalConfig();
    for (const k of bad) out[k] = prev[k];
    await writeSetting("journal", out);
    revalidatePath("/", "layout");
    redirect(`/admin/settings?error=${encodeURIComponent("The other settings were saved, but: " + errors.join(" "))}`);
  }
  await writeSetting("journal", out);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function savePolicyAction(form: FormData) {
  await requireAdmin();
  const slug = String(form.get("slug") || "");
  const def = DEFAULT_POLICIES.find((p) => p.slug === slug);
  if (!def) redirect("/admin/policies");
  if (form.get("reset") === "1") {
    await savePolicy(slug, { title: def.title, body: def.body, approved: false });
  } else {
    const title = String(form.get("title") || "").trim() || def.title;
    const body = String(form.get("body") || "").replace(/\r\n/g, "\n").trim();
    await savePolicy(slug, { title, body: body || def.body, approved: form.get("approved") === "on" });
  }
  revalidatePath(`/policies/${slug}`);
  redirect(`/admin/policies/${slug}?saved=1`);
}

/** Writes the suggested DOIs into articles of an issue that don't have one. Do this only after the deposit is accepted by Crossref. */
export async function saveIssueDois(form: FormData) {
  await requireAdmin();
  const slug = String(form.get("issue") || "");
  const issue = (await db.select().from(issues).where(eq(issues.slug, slug)).limit(1))[0];
  if (!issue) redirect("/admin/indexing");
  const cfg = await getJournalConfig();
  const list = await getIssueArticles(issue.id);
  let n = 0;
  for (const p of planDois(issue, list, cfg)) {
    if (p.existing || !p.doi) continue;
    await db.update(articles).set({ doi: p.doi, updatedAt: new Date() }).where(and(eq(articles.id, p.article.id)));
    n++;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/indexing?doisSaved=${n}&issue=${encodeURIComponent(slug)}#issue-${slug}`);
}
