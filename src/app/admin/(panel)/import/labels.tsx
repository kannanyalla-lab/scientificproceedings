import { isStalled, type ImportStatus } from "@/lib/importer/jobs";

export function stateLabel(s: ImportStatus) {
  if (isStalled(s)) return <span className="pill pill--warn">Stopped</span>;
  switch (s.state) {
    case "queued": case "running": return <span className="pill">Extracting {s.progress}%</span>;
    case "review": return <span className="pill pill--warn">Ready to review</span>;
    case "published": return <span className="pill pill--ok">Published</span>;
    case "failed": return <span className="pill pill--warn">Failed</span>;
    default: return <span className="pill">{s.state}</span>;
  }
}
