import { z } from "zod";
import { CritiqueInputSchema, CritiqueResponseSchema, hasValidEvidence, type CritiqueInput, type CritiqueResponse } from "@/lib/critique-contract";

export const MAX_RECORD_BYTES = 512 * 1024;
export const DecisionSchema = z.object({
  status: z.enum(["pending", "accept", "reject", "modify"]),
  reason: z.string().max(2_000),
}).strict();

export const ReviewRecordSchema = z.object({
  format: z.literal("wedges-review"),
  version: z.literal(1),
  createdAt: z.string().datetime(),
  sources: CritiqueInputSchema.strict(),
  critique: CritiqueResponseSchema.nullable(),
  decisions: z.array(DecisionSchema).max(3),
  revisedWork: z.string().max(8_000),
}).strict().refine((record) => record.decisions.length === (record.critique?.suggestions.length ?? 0)
  && (!record.critique || hasValidEvidence(record.critique, record.sources)), "Review evidence and decisions must match its source snapshot");

export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;
export type Decision = z.infer<typeof DecisionSchema>;

export function createReviewRecord(sources: CritiqueInput, critique: CritiqueResponse | null = null): ReviewRecord {
  return ReviewRecordSchema.parse({
    format: "wedges-review", version: 1, createdAt: new Date().toISOString(),
    sources, critique, revisedWork: sources.work,
    decisions: critique?.suggestions.map(() => ({ status: "pending", reason: "" })) ?? [],
  });
}

export function parseReviewRecord(text: string): ReviewRecord {
  if (new TextEncoder().encode(text).length > MAX_RECORD_BYTES) throw new Error("Review files must be 512 KB or smaller. Your current work is unchanged.");
  try {
    return ReviewRecordSchema.parse(JSON.parse(text));
  } catch {
    throw new Error("This is not a valid Wedges review v1 JSON file. Your current work is unchanged.");
  }
}

export function exportReviewJson(record: ReviewRecord): string {
  return JSON.stringify(ReviewRecordSchema.parse(record), null, 2) + "\n";
}

function literal(text: string) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
}

export function exportReviewMarkdown(record: ReviewRecord): string {
  const r = ReviewRecordSchema.parse(record);
  return [
    "# Wedges — author review", `Created: ${r.createdAt}`,
    "AI suggestions are generated interpretation. Decisions and revisions are author-supplied. Imported records do not verify authorship.",
    "## Original draft", literal(r.sources.work), "## Taste supplied for this review", literal(r.sources.profileMarkdown),
    "## Review question", literal(r.sources.question || "No question supplied."),
    "## Critique", r.critique ? literal(r.critique.explanation) : "No critique recorded.",
    ...(r.critique?.suggestions.flatMap((s, i) => [
      `### Suggestion ${i + 1}`, "Work evidence:", literal(s.workQuote), "Taste evidence:", literal(s.profileQuote),
      "AI suggestion:", literal(s.suggestion), "AI reasoning:", literal(s.reason),
      `Author decision: **${r.decisions[i].status}**`, "Author reason:", literal(r.decisions[i].reason || "No reason supplied."),
    ]) ?? []),
    "## Author's working revision", literal(r.revisedWork),
    "Accepting a suggestion does not apply an edit. Pending decisions are not approvals. Keep the JSON export to reopen this record in Wedges.",
  ].join("\n\n") + "\n";
}
