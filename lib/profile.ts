import type { MirrorBoothResult } from "@/lib/exercises/mirror-booth";
import type { TasteAuditResult } from "@/lib/exercises/taste-audit";
import type { SelectorProfile } from "@/lib/selector-pressure";
import type { Irreducibles } from "@/lib/irreducibles";

/** The three-documents content, gathered conversationally by the agent. */
export interface ThreeDocuments {
  styleGuide?: string;
  worldview?: string;
  glossary?: string;
}

export interface ProfileInput {
  owner?: string;
  mirror?: MirrorBoothResult;
  taste?: TasteAuditResult;
  pressure?: SelectorProfile;
  irreducibles?: Irreducibles;
  documents?: ThreeDocuments;
  notes?: string;
  generatedAt?: string;
}

export interface ProfileArtifact {
  json: ProfileInput & { generatedAt: string; source: "wedges" };
  markdown: string;
}

/**
 * Assemble the portable taste profile — the thing an agent loads to serve the
 * user's work without flattening it. This is the literal output of the Both
 * Hands Full "three documents" exercise, enriched by the extraction tools.
 */
export function buildProfileArtifact(input: ProfileInput): ProfileArtifact {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const owner = input.owner?.trim() || "this person";
  const sections: string[] = [];

  sections.push(
    `# Taste Profile — ${owner}`,
    "",
    `> Extracted with Wedges, the agent edition of Both Hands Full. Load this so you serve ${owner}'s work without flattening it: hold critique in one hand, curiosity in the other.`,
    "",
    `Generated: ${generatedAt}`,
  );

  if (input.documents?.styleGuide?.trim()) {
    sections.push("", "## Style Guide", "_What the voice actually does._", "", input.documents.styleGuide.trim());
  }
  if (input.documents?.worldview?.trim()) {
    sections.push("", "## Worldview", "_What this person believes and refuses._", "", input.documents.worldview.trim());
  }
  if (input.documents?.glossary?.trim()) {
    sections.push("", "## Glossary · Anti-Glossary", "_Words to echo, words to avoid._", "", input.documents.glossary.trim());
  }

  if (input.mirror) {
    const m = input.mirror;
    sections.push(
      "",
      "## Voice Patterns (Mirror Booth)",
      "_Specifics that define the voice — preserve these; never sand them down._",
      "",
      "**Preserve:**",
      ...m.preserved.map((p) => `- "${p.phrase}" — ${p.reason}`),
      "",
      "**Watch for flattening:**",
      ...m.flattened.map((p) => `- "${p.phrase}" — ${p.reason}${p.replacement ? ` → restore toward: ${p.replacement}` : ""}`),
    );
    if (m.driftWarnings.length) {
      sections.push("", "**Drift warnings:**", ...m.driftWarnings.map((w) => `- ${w}`));
    }
  }

  if (input.taste) {
    const t = input.taste;
    sections.push(
      "",
      "## Visual Taste (Taste Audit)",
      "",
      "**Recurring themes:**",
      ...t.themes.map((th) => `- ${th.name} (${th.confidence}) — ${th.evidence}`),
      "",
      `**Palette:** ${t.palette.dominant.join(", ")} — ${t.palette.mood}`,
      `**Composition:** ${t.composition}`,
      t.recurringSubjects.length ? `**Recurring subjects:** ${t.recurringSubjects.join(", ")}` : "",
      `**Voice:** ${t.voice}`,
    );
    if (t.antiPatterns.length) {
      sections.push("", "**Visual anti-patterns (avoid these):**", ...t.antiPatterns.map((a) => `- ${a}`));
    }
  }

  if (input.pressure) {
    const p = input.pressure;
    sections.push(
      "",
      "## Taste Under Pressure (Selector Pressure)",
      "",
      `**Consistency:** ${p.consistencyScore}% over ${p.completedRounds} rounds. ${p.dominantLine}`,
      "",
      `**Repeatedly chooses:** ${p.chosenTags.map((tag) => `${tag.label} (${tag.count})`).join(", ") || "—"}`,
      `**Repeatedly rejects:** ${p.rejectedTags.map((tag) => `${tag.label} (${tag.count})`).join(", ") || "—"}`,
      "",
      "**Contradictions:**",
      ...p.contradictions.map((c) => `- ${c}`),
    );
  }

  if (input.irreducibles && input.irreducibles.items.length) {
    sections.push(
      "",
      "## Irreducibles (Refuse to Outsource)",
      "_The things AI can't eat. Never offer to generate or replace these._",
      "",
      ...input.irreducibles.items.map((i) => `- ${i}`),
    );
    if (input.irreducibles.whyTheseStay) {
      sections.push("", `_Why these stay:_ ${input.irreducibles.whyTheseStay}`);
    }
  }

  if (input.notes?.trim()) {
    sections.push("", "## Notes", "", input.notes.trim());
  }

  return {
    json: { ...input, generatedAt, source: "wedges" },
    markdown: sections.filter((line) => line !== undefined).join("\n"),
  };
}
