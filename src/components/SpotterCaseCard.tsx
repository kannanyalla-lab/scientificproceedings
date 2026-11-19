"use client";
import { useState } from "react";

type Props = { caseNo: number; imageUrl: string | null; images?: string[]; question: string; diagnosis: string; findings: string | null };

export default function SpotterCaseCard({ caseNo, imageUrl, images, question, diagnosis, findings }: Props) {
  const [shown, setShown] = useState(false);
  const [guess, setGuess] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const all = images?.length ? images : imageUrl ? [imageUrl] : [];
  return (
    <article className="spot" id={`case-${caseNo}`}>
      <div className="spot__imgs">
        {all.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={`Imaging for case ${caseNo}${all.length > 1 ? `, view ${i + 1}` : ""}`} onClick={() => setZoom(src)} />
        ))}
        {zoom ? (
          <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label="Enlarged image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt={`Imaging for case ${caseNo}, enlarged`} />
          </div>
        ) : null}
      </div>
      <div>
        <span className="eyebrow">Case {caseNo}</span>
        <p style={{ fontSize: "1.05rem" }}>{question}</p>
        {!shown ? (
          <form onSubmit={(e) => { e.preventDefault(); setShown(true); }} className="form">
            <div className="field">
              <label htmlFor={`g-${caseNo}`}>Your diagnosis (optional)</label>
              <input id={`g-${caseNo}`} type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your answer before revealing" />
            </div>
            <div><button className="btn btn--primary" type="submit">Reveal answer</button></div>
          </form>
        ) : (
          <div className="spot__answer" aria-live="polite">
            {guess ? <p className="muted" style={{ fontSize: ".9rem" }}>Your answer: {guess}</p> : null}
            <p><strong>Diagnosis:</strong> {diagnosis}</p>
            {findings ? (
              <>
                <strong>Imaging findings</strong>
                <ul>{findings.split(/\n+/).filter(Boolean).map((f, i) => <li key={i}>{f.replace(/^[-•]\s*/, "")}</li>)}</ul>
              </>
            ) : null}
            <button className="linklike" onClick={() => setShown(false)}>Hide answer</button>
          </div>
        )}
      </div>
    </article>
  );
}
