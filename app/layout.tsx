import type { Metadata } from "next";
import { Special_Elite, Stardos_Stencil } from "next/font/google";
import "./globals.css";

const typewriter = Special_Elite({
  variable: "--font-special-elite",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const stencil = Stardos_Stencil({
  variable: "--font-stardos",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wedges.dev"),
  title: "Wedges — your taste is training data no model contains",
  description:
    "The agent edition of Both Hands Full. Point your agent at Wedges, run the exercises, and get back one file — your voice, your eye, the things you refuse to outsource — so the machine works from your taste, not its defaults.",
  openGraph: {
    title: "Wedges — your taste is training data no model contains",
    description:
      "Point your agent at it. Run the Both Hands Full exercises. Get back one file the machine can read before it touches your work.",
    url: "https://wedges.dev",
    siteName: "Wedges",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wedges — your taste is training data no model contains",
    description:
      "The agent edition of Both Hands Full. A remote MCP server that hands your agent your taste in one file.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${typewriter.variable} ${stencil.variable}`}>
      <body className="grain min-h-screen bg-ink text-paper">{children}</body>
    </html>
  );
}
