"use client";
import { useState } from "react";

type Props = { caseNo: number; imageUrl: string | null; images?: string[]; question: string; diagnosis: string; findings: string | null; category?: string; options?: string[] };

export default function SpotterCaseCard({ caseNo, imageUrl, images, question, diagnosis, findings, category = "Radiology", options = [] }: Props) {
  const isImaging = category === "Radiology";
  const key = `${category.toLowerCase()}-${caseNo}`;
  const letter = (o: string) => o.match(/^([A-Z])[.)]/)?.[1] ?? o;
  const correct = (o: string) => letter(o) === letter(diagnosis) || o.trim() === diagnosis.trim();
  const [shown, setShown] = useState(false);
  const [guess, setGuess] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const all = images?.length ? images : imageUrl ? [imageUrl] : [];
  return (
    <article className="spot" id={isImaging ? `case-${caseNo}` : `${key}`}>
      <div className="spot__imgs">
        {all.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={`${isImaging ? "Imaging" : "Clinical image"} for case ${caseNo}${all.length > 1 ? `, view ${i + 1}` : ""}`} onClick={() => setZoom(src)} />
        ))}
        {zoom ? (
          <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label="Enlarged image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt={`Case ${caseNo}, enlarged`} />
          </div>
        ) : null}
      </div>
      <div>
        <span className="eyebrow">Case {caseNo}</span>
        <p style={{ fontSize: "1.05rem" }}>{question}</p>
        {!shown && options.length ? (
          <div className="spot__options" role="group" aria-label={`Answer options for case ${caseNo}`}>
            {options.map((o) => (
              <button key={o} type="button" className="spot__option" onClick={() => { setGuess(o); setShown(true); }}>{o}</button>
            ))}
            <button className="linklike" type="button" onClick={() => setShown(true)}>Just show the answer</button>
          </div>
        ) : !shown ? (
          <form onSubmit={(e) => { e.preventDefault(); setShown(true); }} className="form">
            <div className="field">
              <label htmlFor={`g-${key}`}>Your diagnosis (optional)</label>
              <input id={`g-${key}`} type="text" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your answer before revealing" />
            </div>
            <div><button className="btn btn--primary" type="submit">Reveal answer</button></div>
          </form>
        ) : (
          <div className="spot__answer" aria-live="polite">
            {guess ? (
              <p className={options.length ? (correct(guess) ? "result--ok" : "result--no") : "muted"} style={{ fontSize: ".9rem" }}>
                Your answer: {guess}{options.length ? (correct(guess) ? " (correct)" : " (not quite)") : ""}
              </p>
            ) : null}
            <p><strong>{isImaging ? "Diagnosis" : "Answer"}:</strong> {diagnosis}</p>
            {findings ? (
              <>
                <strong>{isImaging ? "Imaging findings" : "Explanation"}</strong>
                <ul>{findings.split(/\n+/).filter(Boolean).map((f, i) => <li key={i}>{f.replace(/^[-•]\s*/, "")}</li>)}</ul>
              </>
            ) : null}
            <button className="linklike" onClick={() => { setShown(false); setGuess(""); }}>Hide answer</button>
          </div>
        )}
      </div>
    </article>
  );
}
