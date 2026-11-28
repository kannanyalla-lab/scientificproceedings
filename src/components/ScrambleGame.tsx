"use client";
import { useMemo, useState } from "react";

type Item = { id: number; specialty: string; clue: string; scrambled: string; answer: string };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function ScrambleGame({ items }: { items: Item[] }) {
  const specialties = useMemo(() => [...new Set(items.map((i) => i.specialty))], [items]);
  const [filter, setFilter] = useState<string>("All");
  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<Record<number, "right" | "wrong" | "revealed">>({});

  const solved = Object.values(status).filter((s) => s === "right").length;
  const visible = filter === "All" ? items : items.filter((i) => i.specialty === filter);

  function check(item: Item) {
    const ok = norm(guesses[item.id] || "") === norm(item.answer);
    setStatus((s) => ({ ...s, [item.id]: ok ? "right" : "wrong" }));
  }

  // Number items within each specialty and mark where a new specialty starts.
  const rows = visible.map((item, i) => {
    const header = i === 0 || visible[i - 1].specialty !== item.specialty ? item.specialty : null;
    return { item, header };
  });
  const numbers = new Map<number, number>();
  for (const sp of specialties) items.filter((x) => x.specialty === sp).forEach((x, i) => numbers.set(x.id, i + 1));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="tabs" role="group" aria-label="Filter by specialty" style={{ marginBottom: 0 }}>
          {["All", ...specialties].map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <span className="score" aria-live="polite">Solved {solved} / {items.length}</span>
      </div>
      {rows.map(({ item, header }) => {
        const n = numbers.get(item.id);
        const st = status[item.id];
        return (
          <div key={item.id}>
            {header ? <h2 style={{ marginTop: 28 }}>{header}</h2> : null}
            <div className={`scramble-card ${st === "right" ? "is-right" : ""}`} style={{ marginBottom: 14 }}>
              <div><span className="eyebrow" style={{ display: "inline" }}>{n}.</span> <strong>Clue:</strong> {item.clue}</div>
              <div className="scramble-word" aria-label={`Scrambled letters: ${item.scrambled.split("").join(" ")}`}>{item.scrambled}</div>
              {st === "right" || st === "revealed" ? (
                <p className={`result ${st === "right" ? "result--ok" : ""}`} style={{ margin: 0 }}>
                  {st === "right" ? "Correct! " : "Answer: "}<span style={{ textTransform: "capitalize" }}>{item.answer}</span>
                </p>
              ) : (
                <>
                  <form onSubmit={(e) => { e.preventDefault(); check(item); }}>
                    <label className="sr-only" htmlFor={`s-${item.id}`}>Your answer</label>
                    <input id={`s-${item.id}`} value={guesses[item.id] || ""} onChange={(e) => setGuesses((g) => ({ ...g, [item.id]: e.target.value }))} placeholder="Your answer" autoComplete="off" />
                    <button className="btn btn--primary btn--sm" type="submit">Check</button>
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => setStatus((s) => ({ ...s, [item.id]: "revealed" }))}>Reveal</button>
                  </form>
                  {st === "wrong" ? <p className="result result--no" style={{ margin: 0 }}>Not quite. Try again.</p> : null}
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
