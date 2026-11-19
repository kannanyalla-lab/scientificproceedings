import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import type { Issue } from "@/db/schema";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Reads a page image: from /public when it's there, otherwise over HTTP (e.g. on Vercel). */
async function loadImage(src: string, origin: string): Promise<Uint8Array> {
  if (src.startsWith("/") && !src.includes("..")) {
    try { return new Uint8Array(await readFile(path.join(PUBLIC_DIR, src))); } catch { /* fall through */ }
  }
  const res = await fetch(new URL(src, origin));
  if (!res.ok) throw new Error(`Could not load ${src}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Page-image paths for printed pages start..end of an issue. */
export function issuePageImages(issue: Pick<Issue, "pageImages" | "pageOffset">, start?: number, end?: number) {
  const imgs = issue.pageImages || [];
  if (start == null) return imgs;
  const from = start + issue.pageOffset - 1;
  const to = (end ?? start) + issue.pageOffset - 1;
  return imgs.slice(Math.max(0, from), Math.min(imgs.length, to + 1));
}

/** Builds a PDF with one page per scanned image. */
export async function pdfFromImages(srcs: string[], origin: string, meta: { title: string; author?: string; subject?: string; keywords?: string[] }) {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setAuthor(meta.author || "KIMSHEALTH");
  doc.setSubject(meta.subject || "KIMSHEALTH Scientific Proceedings");
  if (meta.keywords?.length) doc.setKeywords(meta.keywords);
  doc.setProducer("KIMSHEALTH Scientific Proceedings");
  doc.setCreator("KIMSHEALTH Scientific Proceedings");
  const bytes = await Promise.all(srcs.map((s) => loadImage(s, origin)));
  for (let i = 0; i < srcs.length; i++) {
    const b = bytes[i];
    const isPng = b[0] === 0x89 && b[1] === 0x50;
    const img = isPng ? await doc.embedPng(b) : await doc.embedJpg(b);
    // A4 width (595pt), keeping the scan's proportions.
    const w = 595.28, h = (img.height / img.width) * w;
    const page = doc.addPage([w, h]);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return doc.save();
}

export function pdfResponse(bytes: Uint8Array, filename: string, download: boolean) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename.replace(/[^\w.-]+/g, "-")}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
