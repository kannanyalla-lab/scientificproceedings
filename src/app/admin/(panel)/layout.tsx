import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ENTITIES } from "@/lib/admin-entities";
import { logout } from "../actions";
import AdminNav from "./AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin">
      <aside className="admin-side">
        <Link href="/admin" className="brand" style={{ color: "#fff" }}><span className="brand__name">Scientific Proceedings</span></Link>
        <div style={{ fontSize: ".75rem", color: "#8aa0b3", marginTop: 4 }}>Editor panel</div>
        <AdminNav items={[{ href: "/admin", label: "Dashboard" }, ...Object.values(ENTITIES).map((e) => ({ href: `/admin/${e.key}`, label: e.plural }))]} />
        <div style={{ marginTop: 28, fontSize: ".8rem", color: "#8aa0b3", display: "grid", gap: 8 }}>
          <span>Signed in as {admin.email}</span>
          <Link href="/" target="_blank" style={{ color: "#c7d3de" }}>View site ↗</Link>
          <form action={logout}><button className="linklike" style={{ color: "#c7d3de" }}>Sign out</button></form>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
