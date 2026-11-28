"use client";
import { useEffect, useState } from "react";
import type { SearchResponse } from "@/lib/search-shared";

type State = { key: string; data: SearchResponse | null; error: boolean };

/** Fetches /api/search as the user types: waits briefly between keystrokes and drops stale replies. */
export function useLiveSearch(q: string, params: Record<string, string | undefined> = {}, delay = 180) {
  const query = q.trim();
  const sp = new URLSearchParams({ q: query });
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const reqKey = query ? sp.toString() : "";
  const [state, setState] = useState<State>({ key: "", data: null, error: false });

  useEffect(() => {
    if (!reqKey) return;
    const c = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${reqKey}`, { signal: c.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SearchResponse;
        setState({ key: reqKey, data, error: false });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState((s) => ({ ...s, key: reqKey, error: true }));
      }
    }, delay);
    return () => { clearTimeout(t); c.abort(); };
  }, [reqKey, delay]);

  return {
    // While a new query is on its way, the previous results stay on screen.
    data: reqKey ? state.data : null,
    loading: !!reqKey && state.key !== reqKey,
    error: !!reqKey && state.key === reqKey && state.error,
  };
}
