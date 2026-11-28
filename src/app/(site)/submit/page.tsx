import type { Metadata } from "next";
import Link from "next/link";
import SubmitForm from "@/components/SubmitForm";

export const metadata: Metadata = { title: "Submit a manuscript" };

export default function SubmitPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link><span aria-hidden>›</span><span>Submit a manuscript</span></div>
          <h1>Submit a manuscript</h1>
          <p>Send your manuscript to the editorial office. Please read the <Link href="/about#guidelines">author guidelines</Link> first. We&apos;ll confirm receipt by email.</p>
        </div>
      </div>
      <div className="container section" style={{ maxWidth: 820 }}>
        <div className="panel"><SubmitForm /></div>
      </div>
    </>
  );
}
