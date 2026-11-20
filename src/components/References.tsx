import { Fragment } from "react";
import { refLinks } from "@/lib/refs";

/** Turns DOIs and web addresses inside a reference into links. */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"]+|\b10\.\d{4,9}\/[^\s,;]+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        const trail = p.match(/[.,;)\]]+$/)?.[0] ?? "";
        const core = trail ? p.slice(0, -trail.length) : p;
        const href = core.startsWith("http") ? core : `https://doi.org/${core}`;
        return <Fragment key={i}><a href={href} target="_blank" rel="noopener noreferrer">{core}</a>{trail}</Fragment>;
      })}
    </>
  );
}

export default function References({ refs, idPrefix = "ref" }: { refs: string[]; idPrefix?: string }) {
  return (
    <ol className="refs">
      {refs.map((r, i) => (
        <li key={i} id={`${idPrefix}-${i + 1}`}>
          <span className="refs__text"><Linked text={r} /></span>
          <span className="refs__links no-print">
            {refLinks(r).map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
