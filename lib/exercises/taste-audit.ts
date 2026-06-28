import { generateObject } from "ai";
import { z } from "zod";
import { resolveProvider, VISION_MODEL } from "@/lib/anthropic";
import { WedgesError, classifyUpstreamError } from "@/lib/errors";

const TIMEOUT_MS = 55_000;
export const MAX_IMAGES = 12;

export const TasteAuditResultSchema = z.object({
  themes: z
    .array(
      z.object({
        name: z.string(),
        evidence: z.string(),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .min(3)
    .max(8),
  palette: z
    .object({
      dominant: z.array(z.string()).min(1).max(5),
      mood: z.string(),
    })
    .strict(),
  composition: z.string(),
  recurringSubjects: z.array(z.string()).max(8),
  voice: z.string(),
  antiPatterns: z.array(z.string()).max(6),
});

export type TasteAuditResult = z.infer<typeof TasteAuditResultSchema>;

export async function runTasteAudit(input: {
  images: { url: string; alt?: string }[];
  notes?: string;
  apiKey?: string;
}): Promise<TasteAuditResult> {
  const { provider } = resolveProvider(input.apiKey);
  if (!provider) throw new WedgesError("missing_key");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await generateObject({
      model: provider(VISION_MODEL),
      schema: TasteAuditResultSchema,
      abortSignal: controller.signal,
      system: [
        "You are a senior art director auditing the visual taste embedded in a body of work.",
        "Look across the images for *recurring* choices, not one-off details.",
        "Be honest. Name patterns the artist might not be aware they're making.",
        "Use specific visual language, not generic adjectives. 'Cool blue dusk light' not 'good lighting'.",
        "Identify anti-patterns — moves the artist consistently *avoids* — those are as defining as what they do.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [
            ...(input.notes
              ? [{ type: "text" as const, text: `Optional brief: ${input.notes}` }]
              : []),
            ...input.images.map((img) => ({ type: "image" as const, image: img.url })),
          ],
        },
      ],
    });
    return result.object;
  } catch (err) {
    throw classifyUpstreamError(err);
  } finally {
    clearTimeout(timer);
  }
}
