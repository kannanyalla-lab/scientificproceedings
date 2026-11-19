import { readFile } from "node:fs/promises";
import path from "node:path";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/storage";
import { getAdmin } from "@/lib/auth";

export async function GET(_req: Request, ctx: RouteContext<"/files/[...path]">) {
  const parts = (await ctx.params).path;
  const full = path.resolve(UPLOAD_DIR, ...parts);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  // Submitted manuscripts are private to editors.
  if (parts[0] === "manuscripts" && !(await getAdmin())) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(full);
    const ext = path.extname(full).slice(1).toLowerCase();
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream",
        "Cache-Control": parts[0] === "manuscripts" ? "private, no-store" : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
