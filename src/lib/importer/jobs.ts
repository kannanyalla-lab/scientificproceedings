// Bookkeeping for edition imports. Each import has a folder in .data/imports/<id>
// holding the uploaded PDF, a status.json the worker keeps up to date, the
// cached answers of each step (so a retry doesn't redo finished work) and,
// when done, result.json: the edition in the same shape as the bundled editions
// (src/db/content/*.json). Page images and figures go to the uploads folder
// under editions/<id>/ so they can be shown while reviewing.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const IMPORTS_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.IMPORTS_DIR || path.join(".data", "imports"));
const SETTINGS_FILE = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".data", "settings.json");
export const UPLOADS_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "uploads");

export type ImportState = "queued" | "running" | "review" | "published" | "failed" | "discarded";

export type ImportStatus = {
  id: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  state: ImportState;
  /** What the worker is doing now, in plain words. */
  step: string;
  progress: number;
  warnings: string[];
  error?: string;
  pid?: number;
  usage: { input: number; output: number };
  model?: string;
  pages?: number;
  summary?: { title: string; slug: string; articles: number; pharma: number; spotters: number; scramble: number };
  publishedSlug?: string;
};

export const newImportId = () => `${new Date().toISOString().slice(0, 10)}-${randomBytes(4).toString("hex")}`;
const validId = (id: string) => /^[\w-]{6,64}$/.test(id);

export function jobDir(id: string) {
  if (!validId(id)) throw new Error("Bad import id");
  return path.join(IMPORTS_DIR, id);
}
export const sourcePath = (id: string) => path.join(jobDir(id), "edition.pdf");
export const resultPath = (id: string) => path.join(jobDir(id), "result.json");
export const stepPath = (id: string, name: string) => path.join(jobDir(id), "steps", `${name}.json`);
/** Folder (inside the uploads folder) and public URL prefix of an import's images. */
export const assetFolder = (id: string) => path.join(UPLOADS_DIR, "editions", id);
export const assetUrl = (id: string, file: string) => `/files/editions/${id}/${file}`;

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(3).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 1));
  await rename(tmp, file);
}

export async function readJson<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return null; }
}

export const readStatus = (id: string) => readJson<ImportStatus>(path.join(jobDir(id), "status.json"));

export async function writeStatus(id: string, patch: Partial<ImportStatus>) {
  const now = new Date().toISOString();
  const cur: ImportStatus = (await readStatus(id)) ?? { id, fileName: "", createdAt: now, updatedAt: now, state: "queued", step: "", progress: 0, warnings: [], usage: { input: 0, output: 0 } };
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  await writeJson(path.join(jobDir(id), "status.json"), next);
  return next;
}

export const saveStep = (id: string, name: string, data: unknown) => writeJson(stepPath(id, name), data);
export const loadStep = <T>(id: string, name: string) => readJson<T>(stepPath(id, name));
export const saveResult = (id: string, data: unknown) => writeJson(resultPath(id), data);

/** All imports, newest first. */
export async function listImports(): Promise<ImportStatus[]> {
  if (!existsSync(IMPORTS_DIR)) return [];
  const ids = (await readdir(IMPORTS_DIR)).filter(validId);
  const all = await Promise.all(ids.map((id) => readStatus(id)));
  return all.filter((s): s is ImportStatus => !!s && s.state !== "discarded").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A running import whose worker has not reported for a while has stopped (e.g. the site was closed). */
export function isStalled(s: ImportStatus) {
  return (s.state === "running" || s.state === "queued") && Date.now() - Date.parse(s.updatedAt) > 4 * 60 * 1000;
}

/* Settings kept on this computer (not in the code), e.g. the Claude API key. */
type Settings = { anthropicApiKey?: string };
export const readSettings = async () => (await readJson<Settings>(SETTINGS_FILE)) ?? {};
export async function writeSettings(patch: Settings) {
  await writeJson(SETTINGS_FILE, { ...(await readSettings()), ...patch });
}
export async function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || (await readSettings()).anthropicApiKey || "";
}
