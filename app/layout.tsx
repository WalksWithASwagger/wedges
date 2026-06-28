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
  title: "Wedges — give your agent your taste",
  description:
    "The agent edition of Both Hands Full. A remote MCP server: point your agent at it, run the taste-extraction exercises, and walk away with a portable taste profile — so it serves your work without flattening it.",
  openGraph: {
    title: "Wedges — give your agent your taste",
    description:
      "Point your agent at it. Run the exercises. Get a portable taste profile that any agent can load — so it serves your work without flattening it.",
    url: "https://wedges.dev",
    siteName: "Wedges",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wedges — give your agent your taste",
    description:
      "The agent edition of Both Hands Full. A remote MCP server that hands your agent a portable taste profile.",
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
