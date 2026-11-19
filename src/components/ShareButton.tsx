"use client";
import { useEffect, useRef, useState } from "react";

export default function ShareButton({ path, title, className = "linklike", label = "Share" }: { path: string; title: string; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
  const enc = encodeURIComponent;

  async function onClick() {
    if (typeof navigator !== "undefined" && navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title, url }); return; } catch { /* fall through to menu */ }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  }

  return (
    <div className="share" ref={ref}>
      <button type="button" className={className} aria-haspopup="menu" aria-expanded={open} onClick={onClick}>{label}</button>
      {open && (
        <div className="share__menu" role="menu">
          <button role="menuitem" onClick={copy}>{copied ? "Link copied ✓" : "Copy link"}</button>
          <a role="menuitem" target="_blank" rel="noopener" href={`https://wa.me/?text=${enc(title + " " + url)}`}>WhatsApp</a>
          <a role="menuitem" target="_blank" rel="noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}>LinkedIn</a>
          <a role="menuitem" target="_blank" rel="noopener" href={`https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`}>X (Twitter)</a>
          <a role="menuitem" target="_blank" rel="noopener" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}>Facebook</a>
          <a role="menuitem" href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>Email</a>
        </div>
      )}
    </div>
  );
}
