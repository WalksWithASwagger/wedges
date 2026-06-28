import { generateObject } from "ai";
import { z } from "zod";
import { resolveProvider, DEFAULT_MODEL } from "@/lib/anthropic";
import { WedgesError, classifyUpstreamError } from "@/lib/errors";

const TIMEOUT_MS = 45_000;
export const MAX_PARAGRAPH_CHARS = 3500;

const PhraseSchema = z
  .object({
    phrase: z.string().min(1),
    reason: z.string().min(1),
    replacement: z.string().optional(),
  })
  .strict();

export const MirrorBoothResultSchema = z
  .object({
    mirrored: z.string().min(40),
    preserved: z.array(PhraseSchema).min(2).max(6),
    flattened: z.array(PhraseSchema).min(2).max(8),
    restorePrompts: z.array(z.string().min(1)).min(2).max(5),
    driftWarnings: z.array(z.string().min(1)).max(4),
  })
  .strict();

export type MirrorBoothResult = z.infer<typeof MirrorBoothResultSchema>;

export async function runMirrorBooth(input: {
  paragraph: string;
  context?: string;
  apiKey?: string;
}): Promise<MirrorBoothResult> {
  const { provider } = resolveProvider(input.apiKey);
  if (!provider) throw new WedgesError("missing_key");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await generateObject({
      model: provider(DEFAULT_MODEL),
      schema: MirrorBoothResultSchema,
      abortSignal: controller.signal,
      temperature: 0.4,
      system: [
        "You are Mirror Booth, a voice-preservation editor for the Both Hands Full keynote.",
        "The exercise teaches that AI is a mirror: specificity in produces cinema; generic input produces content.",
        "Return a deliberately normalized version of the user's paragraph that preserves the broad meaning but flattens some concrete, cultural, sensory, or personal specificity.",
        "Do not invent facts. Do not add claims. If a detail cannot be mirrored without inventing, mark it as flattened.",
        "Name what was preserved and what got homogenized. Be concrete, concise, and a little severe.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [
            input.context ? `Context: ${input.context}` : "",
            "Original paragraph:",
            input.paragraph,
          ]
            .filter(Boolean)
            .join("\n\n"),
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
