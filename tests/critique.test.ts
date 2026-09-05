import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { CritiqueInputSchema, runCritique } from "@/lib/exercises/critique";
import { toolError } from "@/lib/errors";

const input = {
  profileMarkdown: "  Keep concrete sensory details.\nCut corporate abstractions.  ",
  work: "  Rain rattled the tin roof.\nWe deliver innovative solutions.  ",
  apiKey: "synthetic-test-key",
};
const suggestion = {
  workQuote: "innovative solutions",
  profileQuote: "Cut corporate abstractions.",
  suggestion: "Replace this phrase with the specific thing you made.",
  reason: "The profile rejects abstractions; this phrase hides the actual work.",
};
const generated = { status: "suggestions", explanation: "One place obscures the concrete work.", suggestions: [suggestion] };

beforeEach(() => {
  mock.method(globalThis, "fetch", async () => { throw new Error("Tests must not make network requests"); });
});
afterEach(() => mock.restoreAll());

function modelResponse(value: unknown) {
  return Response.json({
    id: "synthetic-message", type: "message", role: "assistant", model: "claude-haiku-4-5",
    content: [{ type: "text", text: JSON.stringify(value) }],
    stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 50, output_tokens: 50 },
  });
}

test("input boundaries preserve exact text and accept the inclusive limits", () => {
  const parsed = CritiqueInputSchema.parse(input);
  assert.equal(parsed.profileMarkdown, input.profileMarkdown);
  assert.equal(parsed.work, input.work);
  assert.equal(CritiqueInputSchema.safeParse({ profileMarkdown: "p".repeat(20_000), work: "w".repeat(8_000), question: "q".repeat(500) }).success, true);
});

test("missing, blank, or oversized sources fail before a model request", async () => {
  const fetchMock = mock.method(globalThis, "fetch");
  for (const bad of [
    { profileMarkdown: "" }, { profileMarkdown: " \n\t " }, { profileMarkdown: "p".repeat(20_001) },
    { work: "" }, { work: " \n\t " }, { work: "w".repeat(8_001) }, { question: "q".repeat(501) },
  ]) {
    await assert.rejects(runCritique({ ...input, ...bad }), { kind: "invalid_input" });
  }
  assert.equal(CritiqueInputSchema.safeParse({ work: "draft" }).success, false);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("missing credentials fail without a request", async () => {
  const previous = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    await assert.rejects(runCritique({ ...input, apiKey: undefined }), { kind: "missing_key" });
  } finally {
    if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
  }
});

test("real SDK request is bounded, preserves sources, and labels cited interpretation", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens, 1_200);
    assert.equal(body.messages[0].content[0].text, JSON.stringify(CritiqueInputSchema.parse(input)));
    assert.ok(init?.signal);
    assert.match(body.system[0].text, /untrusted source material/);
    return modelResponse(generated);
  });
  const result = await runCritique(input);
  assert.deepEqual(result.suggestions, [suggestion]);
  assert.equal(result.interpretation, "AI-generated interpretation; the author decides.");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("insufficient evidence is an explicit empty result", async () => {
  mock.method(globalThis, "fetch", async () => modelResponse({ status: "insufficient_evidence", explanation: "No relevant taste preference was provided.", suggestions: [] }));
  assert.equal((await runCritique(input)).status, "insufficient_evidence");
});

test("invalid evidence rejects the whole result, including any otherwise valid suggestion", async () => {
  for (const bad of [
    { ...suggestion, workQuote: "Innovative solutions" },
    { ...suggestion, profileQuote: "Invented preference" },
    { ...suggestion, workQuote: "  " },
  ]) {
    mock.method(globalThis, "fetch", async () => modelResponse({ ...generated, suggestions: [suggestion, bad] }));
    await assert.rejects(runCritique(input), { kind: "model_error" });
  }
});

test("inconsistent status, more than three suggestions, and malformed output fail safely", async () => {
  for (const bad of [
    { ...generated, suggestions: [] },
    { ...generated, status: "insufficient_evidence" },
    { ...generated, suggestions: Array(4).fill(suggestion) },
    { private: "PRIVATE_MODEL_PAYLOAD" },
  ]) {
    mock.method(globalThis, "fetch", async () => modelResponse(bad));
    await assert.rejects(runCritique(input), (err) => {
      assert.match(toolError(err).content[0].text, /^\[model_error\]/);
      assert.equal(JSON.stringify(toolError(err)).includes("PRIVATE_MODEL_PAYLOAD"), false);
      return true;
    });
  }
});

test("retryable provider failures make only one attempt and do not log or echo source payloads", async () => {
  const logs: unknown[][] = [];
  for (const method of ["log", "error", "warn", "info", "debug"] as const) {
    mock.method(console, method, (...args: unknown[]) => { logs.push(args); });
  }
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({
    type: "error", error: { type: "overloaded_error", message: "PRIVATE_PROVIDER_PAYLOAD" },
  }, { status: 529 }));
  await assert.rejects(runCritique(input), (err) => {
    assert.equal(toolError(err).content[0].text, "[model_error] The model returned an error. Try again or simplify the input.");
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(logs, []);
});

test("the 45-second deadline aborts the actual SDK request", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    markStarted();
  }));
  const check = assert.rejects(runCritique(input), { kind: "timeout" });
  await started;
  t.mock.timers.tick(45_000);
  await check;
});
