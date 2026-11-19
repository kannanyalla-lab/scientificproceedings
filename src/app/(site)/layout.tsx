import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Pages read live content from the database on every request.
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame">
      <a className="skip" href="#main">Skip to content</a>
      <div className="site-box">
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
