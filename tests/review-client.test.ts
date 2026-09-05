import assert from "node:assert/strict";
import { test } from "node:test";
import { requestCritique } from "@/lib/review-client";
import { critique, sources } from "./fixtures/review";

test("browser adapter exercises the actual MCP client handshake and exact tool arguments", async (t) => {
  const calls: string[] = [];
  let toolResult: unknown = { content: [{ type: "text", text: JSON.stringify(critique) }] };
  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    const message = JSON.parse(init?.body as string);
    calls.push(message.method);
    if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
    if (message.method === "tools/call") assert.deepEqual(message.params, { name: "critique", arguments: sources });
    return Response.json({ jsonrpc: "2.0", id: message.id, result: message.method === "initialize"
      ? { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "test", version: "1" } }
      : toolResult });
  });
  const run = () => requestCritique(sources, new URL("http://localhost/api/mcp"), new AbortController().signal);
  assert.deepEqual(await run(), critique);
  assert.deepEqual(calls, ["initialize", "notifications/initialized", "tools/call"]);
  for (const payload of ["not json", JSON.stringify({ ...critique, suggestions: [{ ...critique.suggestions[0], workQuote: "invented" }] })]) {
    toolResult = { content: [{ type: "text", text: payload }] };
    await assert.rejects(run(), /could not be completed/);
  }
  toolResult = { isError: true, content: [{ type: "text", text: "[rate_limited] PRIVATE_PROVIDER_MESSAGE" }] };
  await assert.rejects(run(), (error: Error) => /rate-limited/.test(error.message) && !/PRIVATE/.test(error.message));
});

test("browser transport errors and aborts cannot leak payloads or complete as successful reviews", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("The critique timed out. PRIVATE_NETWORK_CONTENT"); });
  await assert.rejects(requestCritique(sources, new URL("http://localhost/api/mcp"), new AbortController().signal), (error: Error) => !error.message.includes("PRIVATE"));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestCritique(sources, new URL("http://localhost/api/mcp"), controller.signal));
});
