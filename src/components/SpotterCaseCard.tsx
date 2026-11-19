"use client";
import { useState } from "react";

type Props = { caseNo: number; imageUrl: string | null; question: string; diagnosis: string; findings: string | null };

export default function SpotterCaseCard({ caseNo, imageUrl, question, diagnosis, findings }: Props) {
  const [shown, setShown] = useState(false);
  const [guess, setGuess] = useState("");
  const [zoom, setZoom] = useState(false);
  return (
    <article className="spot" id={`case-${caseNo}`}>
      <div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={`Imaging for case ${caseNo}`} onClick={() => setZoom(true)} />
        ) : null}
        {zoom && imageUrl ? (
          <div className="lightbox" onClick={() => setZoom(false)} role="dialog" aria-label="Enlarged image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={`Imaging for case ${caseNo}, enlarged`} />
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
