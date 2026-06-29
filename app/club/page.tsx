import type { Metadata } from "next";
import { StartRoom } from "./StartRoom";

export const metadata: Metadata = {
  title: "Film Club — Wedges",
  description:
    "Find five people. Watch each other's work. Real feedback, not polite feedback — through each other's taste. A Wedges room.",
};

export default function ClubHub() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
      <header className="flex items-center justify-between border-b-2 border-paper/15 py-5">
        <a href="/" className="flex items-center gap-3">
          <span aria-hidden className="text-blood text-2xl leading-none">◣</span>
          <span className="stencil text-paper text-xl">Wedges</span>
        </a>
        <span className="kicker text-paper/55">Film Club</span>
      </header>

      <section className="pt-16 pb-12 sm:pt-24">
        <p className="kicker text-blood mb-6">A room for five</p>
        <h1 className="stencil text-paper text-[clamp(2.3rem,7vw,4.6rem)]">
          Watch each
          <br />
          other&rsquo;s work.
          <br />
          <span className="text-blood">Real feedback.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-paper/75">
          Start a room. Send the link to a few people you trust. Everyone brings their
          Wedges taste profile and drops one unfinished thing. When you do, the room hands
          you each other member&rsquo;s read — <span className="text-paper">through their taste</span>,
          not a model&rsquo;s. Not polite feedback. Real feedback.
        </p>

        <div className="mt-10">
          <StartRoom />
          <p className="mt-3 kicker text-paper/45">invite-only · you bring your own profile · delete anytime</p>
        </div>
      </section>

      <section className="border-t-2 border-paper/15 py-12">
        <p className="kicker text-paper/45 mb-6">How it works</p>
        <ol className="space-y-5">
          {[
            ["01", "Start a room", "You get a private link and a room code. Share it with your five people."],
            ["02", "Everyone joins with their taste", "Each person joins with a display name and pastes their taste-profile.md (run Wedges first if you don't have one)."],
            ["03", "Drop one thing", "Post a piece you're working on — a paragraph, a scene, a pitch. Text for now."],
            ["04", "Get read through their eyes", "Every other member's taste critiques your work: what they'd cut, where it goes generic, whether they'd ship it."],
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
          Don&rsquo;t have a profile yet?{" "}
          <a href="/" className="text-paper underline decoration-blood underline-offset-4 hover:text-blood">
            Run Wedges first
          </a>{" "}
          — point your agent at it and you&rsquo;ll get the file.
        </p>
      </section>
    </main>
  );
}
