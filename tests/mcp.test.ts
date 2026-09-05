import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

test("critique returns cited JSON and uses the shared-key limiter through the real MCP handler", async (t) => {
  // mcp-handler owns a repeating housekeeping timer without a shutdown API.
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { POST } = await import("@/app/api/[transport]/route");
  const previous = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "synthetic-test-key";
  let respondWithEvidence = true;
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    if (respondWithEvidence) {
      respondWithEvidence = false;
      return Response.json({
        id: "synthetic-message", type: "message", role: "assistant", model: "claude-haiku-4-5",
        content: [{ type: "text", text: JSON.stringify({
          status: "suggestions", explanation: "One phrase hides the actual work.",
          suggestions: [{ workQuote: "innovative solutions", profileQuote: "Prefer concrete detail.", suggestion: "Name the actual work.", reason: "The profile favors specifics over this abstraction." }],
        }) }],
        stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 50, output_tokens: 50 },
      });
    }
    return Response.json({ type: "error", error: { type: "overloaded_error", message: "PRIVATE_MCP_PROVIDER_PAYLOAD" } }, { status: 529 });
  });
  const logs: unknown[][] = [];
  for (const method of ["log", "error", "warn", "info", "debug"] as const) {
    t.mock.method(console, method, (...args: unknown[]) => { logs.push(args); });
  }
  const client = new Client({ name: "critique-limiter-test", version: "1" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost/api/mcp"), {
      fetch: async (url, init) => POST(new Request(url, init)),
      requestInit: { headers: { "x-forwarded-for": "192.0.2.19" } },
    }));
    const success = await client.callTool({ name: "critique", arguments: { profileMarkdown: "Prefer concrete detail.", work: "innovative solutions" } });
    assert.ok(!success.isError);
    const content = success.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    assert.equal(parsed.status, "suggestions");
    assert.equal(parsed.suggestions[0].workQuote, "innovative solutions");
    assert.match(parsed.interpretation, /AI-generated/);
    for (let n = 0; n < 10; n++) {
      const result = await client.callTool({ name: "critique", arguments: { profileMarkdown: "PRIVATE_MCP_PROFILE", work: "PRIVATE_MCP_DRAFT" } });
      assert.equal(result.isError, true);
      const serialized = JSON.stringify(result);
      assert.match(serialized, n < 9 ? /\[model_error\]/ : /\[rate_limited\]/);
      assert.doesNotMatch(serialized, /PRIVATE_MCP/);
    }
    assert.equal(fetchMock.mock.callCount(), 10);
    assert.deepEqual(logs, []);
  } finally {
    await client.close();
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous;
  }
});
