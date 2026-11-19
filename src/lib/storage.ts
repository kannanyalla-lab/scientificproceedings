import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "uploads");

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Saves an uploaded file and returns its public URL (served by /files/[...path]). */
export async function saveUpload(file: File, folder: string) {
  if (!file || file.size === 0) throw new Error("No file selected.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is larger than 20 MB.");
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Unsupported file type. Use PDF, Word, JPG, PNG, WebP or GIF.");
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/files/${safeFolder}/${name}`;
}

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(ALLOWED).map(([mime, ext]) => [ext, mime]),
);
