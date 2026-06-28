import { Connect } from "./components/Connect";
import { Reveal } from "./components/Reveal";

const EXERCISES = [
  {
    n: "01",
    name: "mirror_booth",
    body: "Paste a paragraph in your voice. See exactly which specifics get sanded down.",
  },
  {
    n: "02",
    name: "taste_audit",
    body: "Point it at up to twelve images of your work. It names your recurring choices — and the moves you always avoid.",
  },
  {
    n: "03",
    name: "selector_pressure_test",
    body: "Ten rounds. Pick what you'd ship, defend the cut. A deterministic read on your taste under pressure.",
  },
  {
    n: "04",
    name: "name_irreducibles",
    body: "The things you refuse to outsource. The things AI can't eat.",
  },
  {
    n: "05",
    name: "three_documents",
    body: "Style guide, worldview, glossary — gathered in conversation, the way the keynote teaches it.",
  },
  {
    n: "06",
    name: "export_profile",
    body: "Assembles all of it into the portable artifact you keep.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 sm:px-8">
      {/* ── masthead ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b-2 border-paper/15 py-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-blood text-2xl leading-none">◣</span>
          <span className="stencil text-paper text-xl">Wedges</span>
        </div>
        <a
          href="https://www.bothhandsfull.com"
          className="kicker text-paper/55 hover:text-blood"
        >
          ↗ Both Hands Full
        </a>
      </header>

      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <p className="kicker text-blood mb-6">A remote MCP server · the agent edition of Both Hands Full</p>
        <h1 className="stencil text-paper text-[clamp(2.7rem,9vw,6.5rem)]">
          Stop the machine
          <br />
          from sanding
          <br />
          <span className="text-blood">you</span> down.
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-paper/75">
          Point your agent at Wedges. It runs the exercises Both Hands Full built for
          humans — and hands you back a portable <span className="text-paper">taste profile</span>:
          your voice patterns, your visual instincts, the things you refuse to outsource.
          Load it into any agent and it serves <span className="text-paper">your</span> work,
          not the model&rsquo;s defaults.
        </p>

        <div className="mt-10 max-w-2xl">
          <div className="flex items-stretch gap-3 border-l-2 border-blood bg-black/30 px-4 py-3">
            <code className="min-w-0 grow overflow-x-auto text-sm text-paper sm:text-base">
              <span className="select-none text-blood">$ </span>
              <span className="caret">claude mcp add --transport http wedges https://wedges.dev/api/mcp</span>
            </code>
          </div>
          <p className="mt-3 kicker text-paper/45">
            then say &ldquo;run Wedges&rdquo; · other clients ↓
          </p>
        </div>
      </section>

      {/* ── the flattening (the problem, shown) ──────────────── */}
      <Reveal className="border-t-2 border-paper/15 py-16 sm:py-20">
        <p className="kicker text-paper/45">The problem</p>
        <h2 className="stencil mt-3 text-paper text-[clamp(2rem,6vw,4rem)]">
          AI is a mirror.
        </h2>
        <p className="mt-5 max-w-2xl text-paper/70">
          Specificity in, cinema out. Generic in, content out. Feed it a vague brief and it
          hands back the average of everyone. Here&rsquo;s one real paragraph through the
          Mirror Booth:
        </p>

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          <figure className="border-2 border-paper/25 bg-paper p-5 text-ink">
            <figcaption className="kicker text-blood mb-3">Yours</figcaption>
            <p className="leading-relaxed">
              We shot the whole thing on a borrowed Bolex in my nonna&rsquo;s kitchen in East
              Van, the light going amber through the cheap curtains while she rolled gnocchi
              and refused to look at the lens.
            </p>
          </figure>
          <figure className="border-2 border-paper/15 bg-black/20 p-5 text-paper/55">
            <figcaption className="kicker text-paper/40 mb-3">Flattened by the machine</figcaption>
            <p className="leading-relaxed">
              We shot the whole thing on a borrowed{" "}
              <span className="text-blood/80 line-through decoration-blood">camera</span> in a
              kitchen, the warm light coming through the curtains while she cooked.
            </p>
          </figure>
        </div>
        <p className="mt-5 max-w-2xl text-sm text-paper/55">
          Bolex → camera. Nonna&rsquo;s East Van kitchen → a kitchen. The gnocchi, the cheap
          curtains, the refusal to look at the lens — gone. That&rsquo;s your work becoming
          content. Wedges catches it, and teaches your agent the difference.
        </p>
      </Reveal>

      {/* ── the artifact ─────────────────────────────────────── */}
      <Reveal className="border-t-2 border-paper/15 py-16 sm:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
          <div>
            <p className="kicker text-paper/45">The artifact</p>
            <h2 className="stencil mt-3 text-paper text-[clamp(2rem,6vw,3.6rem)]">
              One file.
              <br />
              Your taste,
              <br />
              portable.
            </h2>
            <p className="mt-5 text-paper/70">
              Run the exercises once. Export a <span className="text-paper">taste-profile.md</span>{" "}
              you keep — markdown and JSON — and load it into any agent so it works from your
              judgment instead of the model&rsquo;s defaults.
            </p>
            <p className="mt-4 text-sm text-paper/50">
              Nothing is stored on our end. The profile is yours.
            </p>
          </div>

          {/* printed page */}
          <div
            className="border-2 border-paper/30 bg-paper p-5 text-ink shadow-[6px_6px_0_0_rgba(225,6,0,0.9)] sm:p-6"
            style={{ rotate: "-0.6deg" }}
          >
            <pre className="overflow-x-auto whitespace-pre-wrap text-[0.82rem] leading-relaxed">
{`# Taste Profile — Kris

> Load this so you serve Kris's work
> without flattening it.

## Voice patterns
PRESERVE  concrete place-names · the
          cheap-curtains specificity ·
          refusing to explain the joke
WATCH     "camera" (it's a Bolex) ·
          "a kitchen" (nonna's, East Van)

## Irreducibles — what AI can't eat
- Laughing until you can't breathe
- Getting lost in the woods, not caring

## Taste under pressure
Consistency 70% — your hand keeps
moving toward risky, specific cuts.`}
            </pre>
          </div>
        </div>
      </Reveal>

      {/* ── connect ──────────────────────────────────────────── */}
      <Reveal className="border-t-2 border-paper/15 py-16 sm:py-20">
        <p className="kicker text-paper/45">Connect your agent</p>
        <h2 className="stencil mt-3 text-paper text-[clamp(2rem,6vw,3.6rem)]">
          One line. No account. No key.
        </h2>
        <p className="mt-5 mb-9 max-w-2xl text-paper/70">
          Wedges is public and stateless. The exercises run through your agent; the profile
          comes back to you. Use the shared key, or bring your own Anthropic key for more
          depth.
        </p>
        <Connect />
      </Reveal>

      {/* ── exercises ────────────────────────────────────────── */}
      <Reveal className="border-t-2 border-paper/15 py-16 sm:py-20">
        <p className="kicker text-paper/45">What runs</p>
        <h2 className="stencil mt-3 mb-9 text-paper text-[clamp(2rem,6vw,3.6rem)]">
          Six exercises. One profile.
        </h2>
        <ol className="border-t-2 border-paper/15">
          {EXERCISES.map((ex) => (
            <li
              key={ex.name}
              className="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-1 border-b-2 border-paper/15 py-5 sm:grid-cols-[3rem_14rem_1fr] sm:items-baseline"
            >
              <span className="stencil text-blood text-xl">{ex.n}</span>
              <code className="text-paper">{ex.name}</code>
              <span className="col-start-2 text-paper/65 sm:col-start-3">{ex.body}</span>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* ── why / footer ─────────────────────────────────────── */}
      <footer className="border-t-2 border-paper/15 py-16 sm:py-20">
        <p className="stencil text-paper text-[clamp(1.5rem,4.5vw,2.6rem)] leading-tight">
          Hold critique in one hand.
          <br />
          Hold curiosity in the other.
          <br />
          <span className="text-blood">Keep walking.</span>
        </p>
        <p className="mt-7 max-w-2xl text-paper/65">
          Wedges is the machine-facing edition of{" "}
          <a href="https://www.bothhandsfull.com" className="text-paper underline decoration-blood underline-offset-4 hover:text-blood">
            Both Hands Full
          </a>{" "}
          — Kris Krüg&rsquo;s keynote from the World AI Film Festival. Both Hands Full taught
          humans to keep their edge in the age of synthetic everything. Wedges hands that edge
          to your agent.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="https://github.com/WalksWithASwagger/wedges" className="kicker text-paper/60 hover:text-blood">
            ↗ Source
          </a>
          <a href="/llms.txt" className="kicker text-paper/60 hover:text-blood">
            ↗ llms.txt
          </a>
          <a href="https://www.bothhandsfull.com" className="kicker text-paper/60 hover:text-blood">
            ↗ bothhandsfull.com
          </a>
        </div>

        <p className="kicker mt-10 text-paper/35">
          public · no auth · nothing stored · rate-limited · bring your own key
        </p>
      </footer>
    </main>
  );
}
