import type { Metadata } from "next";
import Link from "next/link";
import ReviewClient from "./ReviewClient";

export const metadata: Metadata = {
  title: "Review your work — Wedges",
  description: "Bring a draft and your taste. Inspect cited AI suggestions, make your own decisions, and keep a portable review record.",
  alternates: { canonical: "https://wedges.dev/review" },
  openGraph: { title: "Review your work — Wedges", url: "https://wedges.dev/review" },
};

export default function ReviewPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-20 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-paper/25 py-5">
        <Link href="/" className="stencil text-xl"><span aria-hidden className="text-blood">◣ </span>Wedges</Link>
        <span className="kicker text-paper/70">The work is yours. So is the call.</span>
      </header>
      <section className="py-10 sm:py-14">
        <p className="kicker text-paper/70">01 Bring it. 02 Question it. 03 Make the call.</p>
        <h1 className="stencil mt-4 max-w-3xl text-[clamp(2.7rem,7vw,5.2rem)]">Keep your edge.</h1>
        <p className="mt-5 max-w-2xl text-paper/80">Bring one unfinished thing and the taste you want to protect. Get a few cited suggestions. Keep, cut, or push back. You write the revision.</p>
      </section>
      <ReviewClient />
      <footer className="mt-12 border-t-2 border-paper/25 pt-6 text-sm text-paper/70">
        <Link className="underline underline-offset-4" href="/#connect">Prefer your own agent? Connect Wedges.</Link>
      </footer>
    </main>
  );
}
