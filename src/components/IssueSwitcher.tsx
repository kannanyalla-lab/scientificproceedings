import Link from "next/link";
import type { Issue } from "@/db/schema";

export default function IssueSwitcher({ issues, current, base }: { issues: Issue[]; current: Issue; base: string }) {
  if (issues.length < 2) return null;
  return (
    <nav className="tabs" aria-label="Choose issue">
      {issues.map((i) => (
        <Link key={i.id} href={`${base}?issue=${i.slug}`} aria-current={i.id === current.id ? "true" : undefined}>
          {i.month} {i.year}
        </Link>
      ))}
    </nav>
  );
}
