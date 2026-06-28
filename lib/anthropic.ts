import { createAnthropic } from "@ai-sdk/anthropic";

// Cheap + fast default. Haiku 4.5 supports vision, so taste_audit uses it too.
// Callers who want more depth can override with ANTHROPIC_MODEL or BYO a key.
export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
export const VISION_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

export type KeySource = "byo" | "env";

/**
 * Resolve the Anthropic provider from a per-call key (the agent passes its own
 * key as a tool argument) or the server's env key. In Wedges the BYO key arrives
 * as a tool argument, not a request header — there is no per-user auth.
 */
export function resolveProvider(apiKey?: string) {
  const byo = apiKey?.trim();
  const env = process.env.ANTHROPIC_API_KEY?.trim();
  const key = byo || env;
  if (!key) {
    return { provider: null, source: null as KeySource | null };
  }
  return {
    provider: createAnthropic({ apiKey: key }),
    source: (byo ? "byo" : "env") as KeySource,
  };
}
