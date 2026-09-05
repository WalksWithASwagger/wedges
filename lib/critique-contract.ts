import { z } from "zod";

const nonblank = (max: number) => z.string().max(max).refine((s) => s.trim().length > 0, "Must not be blank");

export const CritiqueInputSchema = z.object({
  profileMarkdown: nonblank(20_000),
  work: nonblank(8_000),
  question: z.string().max(500).optional(),
});

export const CritiqueResultSchema = z.object({
  status: z.enum(["suggestions", "insufficient_evidence"]),
  explanation: nonblank(600),
  suggestions: z.array(z.object({
    workQuote: nonblank(1_000),
    profileQuote: nonblank(1_000),
    suggestion: nonblank(600),
    reason: nonblank(600),
  }).strict()).max(3),
}).strict();

export const INTERPRETATION = "AI-generated interpretation; the author decides.";
export const CritiqueResponseSchema = CritiqueResultSchema.extend({ interpretation: z.literal(INTERPRETATION) });
export type CritiqueInput = z.infer<typeof CritiqueInputSchema>;
export type CritiqueResponse = z.infer<typeof CritiqueResponseSchema>;

export function hasValidEvidence(result: z.infer<typeof CritiqueResultSchema>, input: CritiqueInput) {
  return (result.status === "suggestions" ? result.suggestions.length > 0 : result.suggestions.length === 0)
    && result.suggestions.every((s) => input.work.includes(s.workQuote) && input.profileMarkdown.includes(s.profileQuote));
}
