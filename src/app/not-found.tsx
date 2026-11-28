import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container section" style={{ minHeight: "50vh" }}>
        <h1>Page not found</h1>
        <p>The page you were looking for doesn&apos;t exist or has moved.</p>
        <p><Link className="btn btn--primary" href="/">Go to the home page</Link> <Link className="btn btn--ghost" href="/search">Search articles</Link></p>
      </main>
      <Footer />
    </>
  );
}
