"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>{i.label}</Link>;
      })}
    </nav>
  );
}
