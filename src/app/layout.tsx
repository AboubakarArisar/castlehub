import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  Bricolage_Grotesque,
  Geist,
  Geist_Mono,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

const description = "Where SkyCastle builders post work in progress, launch projects and find people to build with.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "https://castlehub.aboubakarisar.tech"),
  title: "castlehub",
  description,
  // Link previews in Slack, X, Discord and iMessage.
  openGraph: { type: "website", siteName: "castlehub", title: "castlehub", description, images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "castlehub", description, images: ["/og.jpg"] },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // "light" | "dark" pins the theme; no cookie follows the system setting.
  const theme = (await cookies()).get("theme")?.value;
  const themeClass = theme === "dark" || theme === "light" ? theme : "";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${instrumentSerif.variable} ${themeClass}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
