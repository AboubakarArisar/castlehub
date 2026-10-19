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

export const metadata: Metadata = {
  title: "castlehub",
  description: "Where SkyCastle builders show what they're making.",
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
