import LoginForm from "./LoginForm";
import { LOGO_URL } from "@/lib/site";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f6f8", padding: 20 }}>
      <div className="panel" style={{ width: "100%", maxWidth: 400 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} alt="KIMSHEALTH" style={{ height: 48, marginBottom: 14 }} />
        <h1 style={{ fontSize: "1.4rem" }}>Editor sign-in</h1>
        <p className="muted" style={{ fontSize: ".9rem" }}>Scientific Proceedings editorial panel</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
