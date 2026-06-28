/**
 * The Both Hands Full exercise catalog, reduced to what an agent needs:
 * what each exercise is and whether Wedges exposes a tool for it.
 * Ported from bothhandsfull `src/data/exercises.ts`.
 */
export interface CatalogEntry {
  slug: string;
  title: string;
  kicker: string;
  body: string;
  /** The Wedges MCP tool that runs this exercise, if any. */
  tool: string | null;
}

export const CATALOG: CatalogEntry[] = [
  {
    slug: "mirror-booth",
    title: "Mirror Booth",
    kicker: "Voice drift · LLM-backed",
    body: "Paste a paragraph in your voice. The mirror returns the generic version and names which specifics got sanded down.",
    tool: "mirror_booth",
  },
  {
    slug: "taste-audit",
    title: "Taste Audit",
    kicker: "Visual taste · LLM-backed (vision)",
    body: "Give it up to 12 images of your work. It finds the recurring choices — themes, palette, composition, anti-patterns.",
    tool: "taste_audit",
  },
  {
    slug: "selector-pressure-test",
    title: "Selector Pressure",
    kicker: "Taste under pressure · deterministic",
    body: "Ten rounds. Pick what you'd ship, defend the cut. Returns a deterministic taste profile from the choices.",
    tool: "selector_pressure_test",
  },
  {
    slug: "refuse-to-outsource",
    title: "Refuse to Outsource",
    kicker: "The irreducible list",
    body: "Name the things AI can't eat — the experiences and judgments you refuse to delegate. Becomes part of the profile.",
    tool: "name_irreducibles",
  },
  {
    slug: "three-documents",
    title: "Three Documents",
    kicker: "Style guide · worldview · glossary",
    body: "Externalize taste so AI serves your work, not erases it. Gathered conversationally and folded into the exported profile.",
    tool: "export_profile",
  },
];
