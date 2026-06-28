// MCP smoke test for Wedges. Requires the dev server running (npm run dev).
// Connects over Streamable HTTP, enumerates the surface, and exercises the
// deterministic flow end-to-end (no Anthropic key needed).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ENDPOINT = process.env.WEDGES_URL || "http://localhost:3000/api/mcp";

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ " + msg);
    process.exit(1);
  }
  console.log("✓ " + msg);
};

const client = new Client({ name: "wedges-smoke", version: "0.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT)));

const tools = (await client.listTools()).tools.map((t) => t.name);
assert(
  ["list_exercises", "mirror_booth", "taste_audit", "selector_pressure_test", "name_irreducibles", "export_profile"].every((t) => tools.includes(t)),
  `all 6 tools present (got: ${tools.join(", ")})`,
);

const resources = (await client.listResources()).resources.map((r) => r.uri);
assert(resources.includes("wedges://catalog"), "wedges://catalog resource present");
assert(resources.includes("wedges://profile"), "wedges://profile resource present");

const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
assert(prompts.includes("start_wedges"), "start_wedges prompt present");

const catalog = await client.readResource({ uri: "wedges://catalog" });
assert(JSON.parse(catalog.contents[0].text).length === 5, "catalog has 5 entries");

// Deterministic selector run: same choices twice → identical profile.
const choices = [
  { roundId: "poster-line", choiceId: "synthetic-everything", why: "teeth" },
  { roundId: "story-open", choiceId: "monster-kid" },
  { roundId: "exercise-name", choiceId: "the-last-cut" },
];
const run = () =>
  client.callTool({ name: "selector_pressure_test", arguments: { choices, declaredTags: ["risky"] } });
const a = JSON.parse((await run()).content[0].text);
const b = JSON.parse((await run()).content[0].text);
assert(a.completedRounds === 3, `selector counted 3 rounds (got ${a.completedRounds})`);
assert(JSON.stringify(a) === JSON.stringify(b), "selector profile is deterministic");

const irr = await client.callTool({
  name: "name_irreducibles",
  arguments: { items: ["Live music in a sweaty room"], whyTheseStay: "presence" },
});
assert(JSON.parse(irr.content[0].text).reference.length === 5, "irreducibles includes KK reference list");

const exported = await client.callTool({
  name: "export_profile",
  arguments: {
    owner: "Kris",
    pressure: a,
    irreducibles: { items: ["Live music in a sweaty room"], whyTheseStay: "presence" },
    documents: { worldview: "Credit the human hands." },
  },
});
const md = exported.content[0].text;
assert(md.includes("# Taste Profile — Kris"), "profile markdown has titled header");
assert(md.includes("Taste Under Pressure") && md.includes("Irreducibles") && md.includes("Worldview"), "profile includes all provided sections");

// LLM path. With a key in env, exercise the real model via the BYO arg
// (deterministic regardless of server env); without one, assert graceful error.
const SAMPLE = "We shot the whole thing on a borrowed Bolex in my nonna's kitchen in East Van, the light going amber through the cheap curtains while she rolled gnocchi and refused to look at the lens.";
if (process.env.ANTHROPIC_API_KEY) {
  const mb = await client.callTool({
    name: "mirror_booth",
    arguments: { paragraph: SAMPLE, anthropic_api_key: process.env.ANTHROPIC_API_KEY },
  });
  assert(!mb.isError, `mirror_booth (BYO key) succeeded: ${mb.content?.[0]?.text?.slice(0, 80)}`);
  const parsed = JSON.parse(mb.content[0].text);
  assert(typeof parsed.mirrored === "string" && parsed.preserved.length >= 2, "mirror_booth returned a valid structured result");
} else {
  const mb = await client.callTool({
    name: "mirror_booth",
    arguments: { paragraph: "x".repeat(60) },
  });
  assert(mb.isError && mb.content[0].text.includes("missing_key"), "mirror_booth returns missing_key error without a key");
}

await client.close();
console.log("\nAll smoke checks passed.");
