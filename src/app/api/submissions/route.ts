import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { saveUpload } from "@/lib/storage";

const Schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional(),
  affiliation: z.string().trim().max(300).optional(),
  title: z.string().trim().min(1).max(500),
  articleType: z.string().trim().max(80).optional(),
  abstract: z.string().trim().max(5000).optional(),
});

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
  if (form.get("website")) return NextResponse.json({ id: 0 }); // honeypot: silently drop bots

  const get = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : undefined);
  const parsed = Schema.safeParse({
    name: get("name"), email: get("email"), phone: get("phone") || undefined, affiliation: get("affiliation") || undefined,
    title: get("title"), articleType: get("articleType") || undefined, abstract: get("abstract") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Please fill in your name, a valid email and the manuscript title." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Please attach your manuscript file." }, { status: 400 });
  let fileUrl: string;
  try {
    if (!/\.(pdf|docx?)$/i.test(file.name)) throw new Error("Manuscript must be a PDF or Word file.");
    fileUrl = await saveUpload(file, "manuscripts");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const [row] = await db.insert(submissions).values({ ...parsed.data, fileUrl, fileName: file.name.slice(0, 200) }).returning({ id: submissions.id });
  return NextResponse.json({ id: row.id });
}
