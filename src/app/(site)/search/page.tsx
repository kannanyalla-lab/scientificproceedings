import type { Metadata } from "next";
import SearchClient from "@/components/search/SearchClient";
import { SEARCH_KINDS, siteSearch, type SearchKind } from "@/lib/search";
import { ARTICLE_TYPES } from "@/lib/site";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : "";
  const kind = typeof sp.kind === "string" && (SEARCH_KINDS as readonly string[]).includes(sp.kind) ? sp.kind : "";
  const type = typeof sp.type === "string" && (ARTICLE_TYPES as readonly string[]).includes(sp.type) ? sp.type : "";
  // First results are rendered on the server, so a shared link shows them straight away.
  const initial = q.trim() ? await siteSearch(q, { kind: (kind || undefined) as SearchKind | undefined, articleType: type || undefined, limit: 200 }) : null;
  return <SearchClient initialQ={q} initialKind={kind} initialType={type} initial={initial} articleTypes={ARTICLE_TYPES} />;
}
