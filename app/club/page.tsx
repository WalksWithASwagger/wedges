import type { Metadata } from "next";
import Link from "next/link";
import { StartRoom } from "./StartRoom";

export const metadata: Metadata = {
  title: "Film Club — Wedges",
  description:
    "Share unfinished work with a few people. Posting saves work without generating AI feedback. Human comments are not available yet.",
  alternates: {
    canonical: "https://wedges.dev/club",
  },
};

export default function ClubHub() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
      <header className="flex items-center justify-between border-b-2 border-paper/15 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span aria-hidden className="text-blood text-2xl leading-none">◣</span>
          <span className="stencil text-paper text-xl">Wedges</span>
        </Link>
        <span className="kicker text-paper/55">Film Club</span>
      </header>

      <section className="pt-16 pb-12 sm:pt-24">
        <p className="kicker text-blood mb-6">A room for five</p>
        <h1 className="stencil text-paper text-[clamp(2.3rem,7vw,4.6rem)]">
          Watch each
          <br />
          other&rsquo;s work.
          <br />
          <span className="text-blood">Start a conversation.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-paper/75">
          Start a room. Send the link to a few people you trust and drop one unfinished thing.
          Posting saves your work for others to read. It does not generate AI feedback or notify members.
          Human comments are not available yet — discuss the work outside Wedges.
        </p>

        <div className="mt-10">
          <StartRoom />
          <p className="mt-3 kicker text-paper/45">anyone with the link can read · profile optional · creator can delete</p>
        </div>
      </section>

      <section className="border-t-2 border-paper/15 py-12">
        <p className="kicker text-paper/45 mb-6">How it works</p>
        <ol className="space-y-5">
          {[
            ["01", "Start a room", "You get a link and a room code. Anyone with the link can read the room; share thoughtfully."],
            ["02", "Join with a name", "Use a display name. A taste profile is optional and is stored with the room."],
            ["03", "Drop one thing", "Post a piece you're working on — a paragraph, a scene, a pitch. Text for now."],
            ["04", "Read and discuss", "Read the shared work and discuss it outside Wedges for now. Existing feedback is clearly labeled as legacy AI-generated interpretation."],
          ].map(([n, h, b]) => (
            <li key={n} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
              <span className="stencil text-blood text-xl">{n}</span>
              <div>
                <p className="text-paper">{h}</p>
                <p className="text-paper/60">{b}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-sm text-paper/55">
          Want to make a profile?{" "}
          <Link href="/" className="text-paper underline decoration-blood underline-offset-4 hover:text-blood">
            Explore Wedges
          </Link>{" "}
          — it is optional for Film Club.
        </p>
      </section>
    </main>
  );
}
