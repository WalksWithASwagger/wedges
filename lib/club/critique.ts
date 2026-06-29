import { generateObject } from "ai";
import { z } from "zod";
import { resolveProvider, DEFAULT_MODEL } from "@/lib/anthropic";
import { WedgesError, classifyUpstreamError } from "@/lib/errors";

const TIMEOUT_MS = 45_000;

export const CritiqueResultSchema = z
  .object({
    text: z
      .string()
      .min(40)
      .describe("The critique — blunt, specific, in this reviewer's voice. What you'd cut, where it goes generic, what to push. No throat-clearing, no compliment sandwich."),
    wouldShip: z
      .enum(["ship", "hold", "cut"])
      .describe("ship = you'd put your name on it; hold = close but not yet; cut = it's content, not the work."),
  })
  .strict();

export type CritiqueResult = z.infer<typeof CritiqueResultSchema>;

export async function runCritique(input: {
  reviewerName: string;
  reviewerProfile: string;
  work: { title: string; body: string };
  apiKey?: string;
}): Promise<CritiqueResult> {
  const { provider } = resolveProvider(input.apiKey);
  if (!provider) throw new WedgesError("missing_key");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await generateObject({
      model: provider(DEFAULT_MODEL),
      schema: CritiqueResultSchema,
      abortSignal: controller.signal,
      temperature: 0.6,
      system: [
        `You are giving feedback as ${input.reviewerName}, a member of a small crit group ("Film Club"). You are NOT a neutral assistant — you read this work through ${input.reviewerName}'s specific taste, which is captured in the taste profile below. Speak in the first person, as them.`,
        "",
        "This is the Film Club rule: real feedback, not polite feedback. No compliment sandwich. No 'great start!'. No hedging. Say what you actually think through this taste. Be specific — name the exact line, image, or move. Point at where it goes generic (becomes 'content' instead of the work), what you'd cut, and the one thing worth pushing on. Brief is better than thorough — a few sharp sentences beat a list.",
        "",
        "Critique through THIS taste, not a consensus of good taste. If the profile says they reject 'polished' and chase 'risky', a too-clean piece should bother them. Let the lens make the feedback personal and opinionated — two different members should react differently to the same piece.",
        "",
        `--- ${input.reviewerName}'s taste profile ---`,
        input.reviewerProfile.slice(0, 6000),
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            `Here's a piece a fellow member dropped in the room. React to it as ${input.reviewerName}.`,
            "",
            `TITLE: ${input.work.title || "(untitled)"}`,
            "",
            input.work.body,
          ].join("\n"),
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
