"use server";
import { and, eq, ne } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { articles, issues, pharmaUpdates, scrambleItems, spotterCases, submissions } from "@/db/schema";
import { ENTITIES, parseFormValue } from "@/lib/admin-entities";
import { createSession, destroySession, requireAdmin, safeEqual } from "@/lib/auth";
import { pad2, slugify } from "@/lib/format";
import { saveUpload } from "@/lib/storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLES: Record<string, any> = {
  issues, articles, pharma: pharmaUpdates, spotters: spotterCases, scramble: scrambleItems, submissions,
};
const SLUGGED = new Set(["issues", "articles", "pharma"]);

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const expectedEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const expectedPass = process.env.ADMIN_PASSWORD || "";
  if (!expectedEmail || !expectedPass) return { error: "Admin sign-in is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD." };
  // Always compare both to avoid leaking which one was wrong.
  const emailOk = safeEqual(email, expectedEmail);
  const passOk = safeEqual(password, expectedPass);
  if (!(emailOk && passOk)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Incorrect email or password.", email };
  }
  await createSession(email);
  const next = String(form.get("next") || "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

function shuffle(word: string) {
  const a = word.toLowerCase().replace(/\s+/g, "").split("");
  for (let n = 0; n < 5; n++) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.join("") !== word) break;
  }
  return a.join("");
}

async function uniqueSlug(table: PgTable & { slug: never; id: never }, base: string, id: number | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;
  let slug = base || "item";
  for (let n = 2; n < 200; n++) {
    const rows = await db.select({ id: t.id }).from(t).where(id ? and(eq(t.slug, slug), ne(t.id, id)) : eq(t.slug, slug)).limit(1);
    if (!rows.length) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function saveEntity(entityKey: string, idParam: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const cfg = ENTITIES[entityKey];
  const table = TABLES[entityKey];
  if (!cfg || !table) return { error: "Unknown content type." };
  const id = idParam === "new" ? null : Number(idParam);
  if (id === null && !cfg.canCreate) return { error: "This item can't be created here." };

  const values: Record<string, unknown> = {};
  try {
    for (const f of cfg.fields) {
      if (f.type === "readonly") continue;
      if (f.type === "checkbox") { values[f.name] = form.get(f.name) === "on"; continue; }
      if (f.type === "file") {
        const file = form.get(`${f.name}__file`);
        if (file instanceof File && file.size > 0) {
          values[f.name] = await saveUpload(file, entityKey);
          continue;
        }
      }
      const raw = form.get(f.name);
      const parsed = parseFormValue(f, typeof raw === "string" ? raw : "");
      if (f.required && (parsed === null || parsed === "" || (Array.isArray(parsed) && !parsed.length))) {
        return { error: `${f.label} is required.` };
      }
      if (f.type === "number" && Number.isNaN(parsed)) return { error: `${f.label} must be a number.` };
      values[f.name] = parsed;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (SLUGGED.has(entityKey)) {
    const base = slugify(String(values.slug || "")) || (entityKey === "issues"
      ? slugify(`${values.month}-${values.year}-volume-${values.volume}-issue-${pad2(Number(values.number))}`)
      : slugify(String(values.title || "")));
    values.slug = await uniqueSlug(table, base, id);
  }
  if (entityKey === "scramble" && !values.scrambled) values.scrambled = shuffle(String(values.answer || ""));
  if (entityKey === "issues" && values.isCurrent) {
    await db.update(issues).set({ isCurrent: false }).where(id ? ne(issues.id, id) : eq(issues.isCurrent, true));
  }

  values.updatedAt = new Date();
  let savedId = id;
  try {
    if (id) {
      await db.update(table).set(values).where(eq(table.id, id));
    } else {
      const [row] = await db.insert(table).values(values).returning({ id: table.id });
      savedId = row.id;
    }
  } catch (e) {
    const msg = (e as Error).message || "";
    return { error: msg.includes("unique") ? "That URL slug is already in use." : "Could not save. " + msg.slice(0, 200) };
  }
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/${entityKey}/${savedId}?saved=1`);
  return { ok: "Saved." };
}

export async function deleteEntity(entityKey: string, id: number) {
  await requireAdmin();
  const table = TABLES[entityKey];
  if (!table) return;
  await db.delete(table).where(eq(table.id, id));
  revalidatePath("/", "layout");
  redirect(`/admin/${entityKey}?deleted=1`);
}
