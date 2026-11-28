"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isStalled, readStatus, writeSettings, writeStatus } from "@/lib/importer/jobs";
import { discardImport, publishImport, startWorker } from "@/lib/importer/publish";

export type KeyState = { error?: string; ok?: string } | undefined;

export async function saveApiKey(_prev: KeyState, form: FormData): Promise<KeyState> {
  await requireAdmin();
  const key = String(form.get("key") || "").trim();
  if (!key) return { error: "Paste the key first." };
  if (!/^sk-ant-[\w-]{20,}$/.test(key)) return { error: "That doesn't look like a Claude API key. It starts with sk-ant-." };
  await writeSettings({ anthropicApiKey: key });
  revalidatePath("/admin/import");
  return { ok: "Saved. You can now upload an edition." };
}

export async function retryImport(id: string) {
  await requireAdmin();
  const s = await readStatus(id);
  if (!s) redirect("/admin/import");
  if (s.state === "failed" || isStalled(s)) {
    await writeStatus(id, { state: "queued", step: "Starting again", error: undefined });
    startWorker(id);
  }
  redirect(`/admin/import/${id}`);
}

export async function publishAction(id: string, form: FormData) {
  await requireAdmin();
  const s = await readStatus(id);
  if (s?.state !== "review") redirect(`/admin/import/${id}`);
  await publishImport(id, form.get("current") === "on");
  revalidatePath("/", "layout");
  redirect(`/admin/import/${id}?published=1`);
}

export async function discardAction(id: string) {
  await requireAdmin();
  const s = await readStatus(id);
  // After publishing, the site uses the page images and figures, so keep them.
  await discardImport(id, s?.state === "published");
  redirect("/admin/import?discarded=1");
}
