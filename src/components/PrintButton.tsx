"use client";
import { useEffect } from "react";

export default function PrintButton({ auto = false, className = "btn btn--ghost" }: { auto?: boolean; className?: string }) {
  useEffect(() => {
    if (auto) { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }
  }, [auto]);
  return <button type="button" className={className} onClick={() => window.print()}>Print</button>;
}
