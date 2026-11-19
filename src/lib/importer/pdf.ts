// Reads an edition PDF page by page: renders each page to an image, pulls out
// its text layer and finds where pictures sit on the page (so figures can be
// cropped out later). Runs in the import worker (scripts/import-worker.ts), not
// inside Next.js.
import { createRequire } from "node:module";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const PDFJS_DIR = path.dirname(require.resolve("pdfjs-dist/package.json"));

/** A picture on a page, as fractions (0-1) of the page width and height. */
export type PageImage = { id: string; x0: number; y0: number; x1: number; y1: number };

export type PdfPage = {
  /** 1-based page number in the PDF. */
  n: number;
  /** Page size in PDF points. */
  width: number;
  height: number;
  text: string;
  images: PageImage[];
  /** True when the page is a scan (one picture covering the page and little or no text). */
  scanned: boolean;
};

type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;

export async function openPdf(data: Uint8Array): Promise<PdfDoc> {
  return pdfjs.getDocument({
    data,
    standardFontDataUrl: path.join(PDFJS_DIR, "standard_fonts") + path.sep,
    cMapUrl: path.join(PDFJS_DIR, "cmaps") + path.sep,
    cMapPacked: true,
    wasmUrl: path.join(PDFJS_DIR, "wasm") + path.sep,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;
}

type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: M, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Finds the boxes where images are painted on a page, by replaying its drawing operations. */
async function findImages(page: Awaited<ReturnType<PdfDoc["getPage"]>>, n: number): Promise<PageImage[]> {
  const viewport = page.getViewport({ scale: 1 });
  const ops = await page.getOperatorList();
  const O = pdfjs.OPS;
  const stack: M[] = [];
  let ctm: M = [1, 0, 0, 1, 0, 0];
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];
    if (fn === O.save) stack.push(ctm);
    else if (fn === O.restore) ctm = stack.pop() ?? ctm;
    else if (fn === O.transform) ctm = mul(ctm, args as unknown as M);
    else if (fn === O.paintFormXObjectBegin) {
      stack.push(ctm);
      const m = args[0] as M | null;
      if (m && m.length === 6) ctm = mul(ctm, m);
    } else if (fn === O.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintImageMaskXObject || fn === O.paintImageXObjectRepeat) {
      const full = mul(viewport.transform as M, ctm);
      const pts = [apply(full, 0, 0), apply(full, 1, 0), apply(full, 0, 1), apply(full, 1, 1)];
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      boxes.push({
        x0: Math.max(0, Math.min(...xs) / viewport.width), x1: Math.min(1, Math.max(...xs) / viewport.width),
        y0: Math.max(0, Math.min(...ys) / viewport.height), y1: Math.min(1, Math.max(...ys) / viewport.height),
      });
    }
  }
  // Drop icons, rules and logos; merge pictures that overlap (tiles of one picture).
  const big = boxes.filter((b) => b.x1 - b.x0 > 0.06 && b.y1 - b.y0 > 0.04);
  const merged: typeof big = [];
  for (const b of big) {
    const hit = merged.find((m) => b.x0 < m.x1 + 0.005 && b.x1 > m.x0 - 0.005 && b.y0 < m.y1 + 0.005 && b.y1 > m.y0 - 0.005);
    if (hit) {
      hit.x0 = Math.min(hit.x0, b.x0); hit.y0 = Math.min(hit.y0, b.y0);
      hit.x1 = Math.max(hit.x1, b.x1); hit.y1 = Math.max(hit.y1, b.y1);
    } else merged.push({ ...b });
  }
  merged.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return merged.map((b, i) => ({ id: `p${n}i${i + 1}`, x0: r(b.x0), y0: r(b.y0), x1: r(b.x1), y1: r(b.y1) }));
}

async function pageText(page: Awaited<ReturnType<PdfDoc["getPage"]>>) {
  const tc = await page.getTextContent();
  let out = "";
  for (const it of tc.items) {
    if (!("str" in it)) continue;
    out += it.str;
    if (it.hasEOL) out += "\n";
    else if (it.str && !out.endsWith(" ")) out += " ";
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Reads the text and picture positions of every page. */
export async function analysePdf(doc: PdfDoc): Promise<PdfPage[]> {
  const pages: PdfPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const text = await pageText(page);
    const all = await findImages(page, n);
    const cover = all.find((b) => (b.x1 - b.x0) * (b.y1 - b.y0) > 0.8);
    const scanned = !!cover && text.replace(/\s/g, "").length < 200;
    // Full-page pictures (backgrounds, scans) are not figures.
    const images = all.filter((b) => (b.x1 - b.x0) * (b.y1 - b.y0) < 0.8);
    pages.push({ n, width: vp.width, height: vp.height, text, images, scanned });
    page.cleanup();
  }
  return pages;
}

/** Renders a page to a JPEG, `width` pixels wide. */
export async function renderPage(doc: PdfDoc, n: number, width: number, quality = 82): Promise<Buffer> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport }).promise;
  page.cleanup();
  return canvas.encode("jpeg", quality);
}

/** Crops part of a rendered page (box as fractions of the page) to a JPEG. */
export async function cropImage(pageJpeg: Buffer, box: { x0: number; y0: number; x1: number; y1: number }, pad = 0.002): Promise<Buffer> {
  const { loadImage } = await import("@napi-rs/canvas");
  const img = await loadImage(pageJpeg);
  const x0 = Math.max(0, box.x0 - pad) * img.width, y0 = Math.max(0, box.y0 - pad) * img.height;
  const x1 = Math.min(1, box.x1 + pad) * img.width, y1 = Math.min(1, box.y1 + pad) * img.height;
  const w = Math.max(1, Math.round(x1 - x0)), h = Math.max(1, Math.round(y1 - y0));
  const canvas = createCanvas(w, h);
  canvas.getContext("2d").drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, w, h);
  return canvas.encode("jpeg", 88);
}

/** Shrinks a JPEG so its longest side is at most `max` pixels (for sending to Claude). */
export async function shrink(jpeg: Buffer, max: number, quality = 75): Promise<Buffer> {
  const { loadImage } = await import("@napi-rs/canvas");
  const img = await loadImage(jpeg);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  if (s === 1) return jpeg;
  const canvas = createCanvas(Math.round(img.width * s), Math.round(img.height * s));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.encode("jpeg", quality);
}
