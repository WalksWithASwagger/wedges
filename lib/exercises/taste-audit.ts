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

/**
 * An image to audit. Prefer `data` (base64): the agent reads the local file and
 * inlines the bytes. URLs are a fallback and are unreliable — Anthropic fetches
 * them server-side and many hosts block that (robots.txt, hotlink protection).
 */
export interface TasteImage {
  data?: string;
  mediaType?: string;
  url?: string;
  alt?: string;
}

function toImagePart(img: TasteImage): string {
  if (img.data) {
    if (img.data.startsWith("data:")) return img.data;
    return `data:${img.mediaType || "image/png"};base64,${img.data}`;
  }
  if (img.url) return img.url;
  throw new WedgesError("invalid_input", "Each image needs `data` (base64) or `url`.");
}

export async function runTasteAudit(input: {
  images: TasteImage[];
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
            ...input.images.map((img) => ({ type: "image" as const, image: toImagePart(img) })),
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
