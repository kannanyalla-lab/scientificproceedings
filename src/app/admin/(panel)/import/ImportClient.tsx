"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveApiKey, type KeyState } from "@/app/admin/import-actions";

export function KeyForm({ hasKey }: { hasKey: boolean }) {
  const [state, action, pending] = useActionState<KeyState, FormData>(saveApiKey, undefined);
  return (
    <form action={action} className="form" style={{ maxWidth: 560 }}>
      <div className="field">
        <label htmlFor="key">{hasKey ? "Replace the Claude API key" : "Claude API key"}</label>
        <input id="key" name="key" type="password" autoComplete="off" placeholder="sk-ant-..." />
        <div className="hint">Kept only on this computer, in the website&apos;s .data folder.</div>
      </div>
      {state?.error ? <div className="alert alert--err">{state.error}</div> : null}
      {state?.ok ? <div className="alert alert--ok">{state.ok}</div> : null}
      <div><button className="btn btn--primary" disabled={pending}>{pending ? "Saving..." : "Save key"}</button></div>
    </form>
  );
}

export function Uploader({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");

  function upload() {
    if (!file) return;
    setError("");
    setPct(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/import");
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let res: { id?: string; error?: string } = {};
      try { res = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status === 200 && res.id) router.push(`/admin/import/${res.id}`);
      else { setPct(null); setError(res.error || "The upload failed. Please try again."); }
    };
    xhr.onerror = () => { setPct(null); setError("The upload failed. Is the website still running?"); };
    xhr.send(file);
  }

  return (
    <div className="form" style={{ maxWidth: 560 }}>
      <div className="field">
        <label htmlFor="pdf">Edition PDF</label>
        <input id="pdf" type="file" accept="application/pdf,.pdf" disabled={disabled || pct !== null}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="hint">The complete edition as one PDF file, exactly as it is printed or put in the flipbook.</div>
      </div>
      {error ? <div className="alert alert--err">{error}</div> : null}
      {pct !== null ? (
        <div>
          <div className="progress"><span style={{ width: `${pct}%` }} /></div>
          <p className="muted" style={{ fontSize: ".85rem", marginTop: 6 }}>Uploading... {pct}%</p>
        </div>
      ) : null}
      <div><button className="btn btn--primary" onClick={upload} disabled={disabled || !file || pct !== null}>Upload and extract</button></div>
    </div>
  );
}

/** Reloads the page every few seconds while an import is running. */
export function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    t.current = setInterval(() => router.refresh(), seconds * 1000);
    return () => { if (t.current) clearInterval(t.current); };
  }, [router, seconds]);
  return null;
}
