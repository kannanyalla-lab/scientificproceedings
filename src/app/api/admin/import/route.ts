import { createWriteStream } from "node:fs";
import { mkdir, open, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getAdmin } from "@/lib/auth";
import { getApiKey, jobDir, newImportId, sourcePath, writeStatus } from "@/lib/importer/jobs";
import { startWorker } from "@/lib/importer/publish";

// Edition PDFs can be large, so the file is streamed straight to disk
// (this route sits outside /admin, so the proxy doesn't buffer it).
const MAX_BYTES = 400 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Please sign in again." }, { status: 401 });
  if (!(await getApiKey())) return Response.json({ error: "Add your Claude API key first (step 1 on this page)." }, { status: 400 });
  if (!req.body) return Response.json({ error: "No file was received." }, { status: 400 });
  const size = Number(req.headers.get("content-length") || 0);
  if (size > MAX_BYTES) return Response.json({ error: "This PDF is larger than 400 MB. Export a smaller PDF (for example \"Smallest file size\" or \"High quality print\" instead of \"Press quality\")." }, { status: 413 });

  const id = newImportId();
  const fileName = decodeURIComponent(req.headers.get("x-file-name") || "edition.pdf").slice(0, 200);
  await mkdir(jobDir(id), { recursive: true });
  try {
    let received = 0;
    const body = Readable.fromWeb(req.body as import("node:stream/web").ReadableStream);
    body.on("data", (c: Buffer) => { received += c.length; if (received > MAX_BYTES) body.destroy(new Error("too large")); });
    await pipeline(body, createWriteStream(sourcePath(id)));
    const fh = await open(sourcePath(id), "r");
    const head = Buffer.alloc(5);
    await fh.read(head, 0, 5, 0);
    await fh.close();
    if (head.toString("latin1") !== "%PDF-") throw new Error("not a pdf");
  } catch (e) {
    await rm(jobDir(id), { recursive: true, force: true });
    const msg = (e as Error).message === "not a pdf" ? "That file is not a PDF." : "The upload did not finish. Please try again.";
    return Response.json({ error: msg }, { status: 400 });
  }
  await writeStatus(id, { id, fileName, createdAt: new Date().toISOString(), state: "queued", step: "Starting", progress: 0 });
  startWorker(id);
  return Response.json({ id });
}
