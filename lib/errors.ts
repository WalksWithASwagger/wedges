import { APICallError } from "ai";

export type LlmErrorKind =
  | "missing_key"
  | "invalid_key"
  | "rate_limited"
  | "model_error"
  | "timeout"
  | "oversized"
  | "network"
  | "invalid_input"
  | "unknown";

const DEFAULT_MESSAGES: Record<LlmErrorKind, string> = {
  missing_key:
    "No Anthropic API key. Pass `anthropic_api_key` to this tool, or set ANTHROPIC_API_KEY on the server.",
  invalid_key: "Anthropic rejected that API key. Check it and retry.",
  rate_limited: "Anthropic is rate-limiting this key. Wait a minute and retry.",
  model_error: "The model returned an error. Try again or simplify the input.",
  timeout: "The model took too long. Try a smaller input.",
  oversized: "Payload is too big for the model. Trim text or drop images.",
  network: "Couldn't reach Anthropic. Check the connection and retry.",
  invalid_input: "Invalid input.",
  unknown: "Something went wrong. Try again.",
};

export class WedgesError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message?: string,
  ) {
    super(message ?? DEFAULT_MESSAGES[kind]);
    this.name = "WedgesError";
  }
}

const KEY_PATTERN = /api[\s_-]*key|authentication|unauthor|invalid.*key|x-api-key/i;
const RATE_PATTERN = /rate[\s_-]*limit|too many requests|quota/i;
const TIMEOUT_PATTERN = /timeout|timed out|deadline|ETIMEDOUT|AbortError/i;
const NETWORK_PATTERN =
  /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|network|socket hang up/i;
const OVERSIZED_PATTERN =
  /too (large|long)|exceeds.*(tokens|limit|size)|request entity too large|payload.*large|max(imum)?\s*(input|context).*length/i;

export function classifyUpstreamError(err: unknown): WedgesError {
  if (err instanceof WedgesError) return err;
  if (err instanceof Error && err.name === "AbortError") {
    return new WedgesError("timeout");
  }

  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    const text = `${err.message ?? ""} ${err.responseBody ?? ""}`;
    if (status === 401 || status === 403 || KEY_PATTERN.test(text)) {
      return new WedgesError("invalid_key");
    }
    if (status === 408 || TIMEOUT_PATTERN.test(text)) return new WedgesError("timeout");
    if (status === 429 || RATE_PATTERN.test(text)) return new WedgesError("rate_limited");
    if (status === 413 || OVERSIZED_PATTERN.test(text)) return new WedgesError("oversized");
    if (status != null && status >= 500) return new WedgesError("model_error");
    if (status == null && NETWORK_PATTERN.test(text)) return new WedgesError("network");
    return new WedgesError("model_error", err.message);
  }

  if (err instanceof Error) {
    const text = err.message;
    if (TIMEOUT_PATTERN.test(text)) return new WedgesError("timeout");
    if (NETWORK_PATTERN.test(text)) return new WedgesError("network");
    if (OVERSIZED_PATTERN.test(text)) return new WedgesError("oversized");
    if (KEY_PATTERN.test(text)) return new WedgesError("invalid_key");
    return new WedgesError("unknown", text);
  }

  return new WedgesError("unknown");
}

/** A tool result that surfaces an error to the agent without throwing an HTTP error. */
export function toolError(err: unknown) {
  const e = classifyUpstreamError(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `[${e.kind}] ${e.message}` }],
  };
}
