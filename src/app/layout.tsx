import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { JOURNAL, SITE_URL, TAGLINE, LOGO_URL } from "@/lib/site";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${JOURNAL} | ${TAGLINE}`, template: `%s | ${JOURNAL}` },
  description: `${JOURNAL} is the peer-reviewed clinical and scientific research journal of KIMSHEALTH, publishing original research, case reports, reviews and clinical updates.`,
  icons: { icon: LOGO_URL },
  openGraph: { siteName: JOURNAL, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
