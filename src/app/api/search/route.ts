import { NextResponse } from "next/server";
import { SEARCH_KINDS, siteSearch, type SearchKind } from "@/lib/search";
import { ARTICLE_TYPES } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").slice(0, 200);
  const kind = (SEARCH_KINDS as readonly string[]).includes(sp.get("kind") || "") ? (sp.get("kind") as SearchKind) : undefined;
  const type = sp.get("type") || "";
  const articleType = (ARTICLE_TYPES as readonly string[]).includes(type) ? type : undefined;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);
  const res = await siteSearch(q, { kind, articleType, limit });
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
