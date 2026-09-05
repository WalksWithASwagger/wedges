// MCP smoke test for Wedges. Requires the dev server running (npm run dev).
// Connects over Streamable HTTP, enumerates the surface, and exercises the
// deterministic flow end-to-end (no Anthropic key needed).
import assertStrict from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ENDPOINT = process.env.WEDGES_URL || "http://localhost:3000/api/mcp";

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error("✗ " + msg);
  }
  console.log("✓ " + msg);
};

const useLlm = process.argv.includes("--llm");
const client = new Client({ name: "wedges-smoke", version: "0.0.0" });
const secondClient = new Client({ name: "wedges-smoke-second", version: "0.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT)));

  const tools = (await client.listTools()).tools.map((t) => t.name);
  assert(
    ["list_exercises", "get_pressure_rounds", "mirror_booth", "taste_audit", "selector_pressure_test", "name_irreducibles", "export_profile", "critique"].every((t) => tools.includes(t)),
    `all 8 tools present (got: ${tools.join(", ")})`,
  );

  const resources = (await client.listResources()).resources.map((r) => r.uri);
  assert(resources.includes("wedges://catalog"), "wedges://catalog resource present");
  assert(!resources.includes("wedges://profile"), "no shared profile resource is advertised");
  assert(resources.includes("wedges://pressure-rounds"), "pressure rounds resource present");

  const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
  assert(prompts.includes("start_wedges") && prompts.includes("review_draft"), "onboarding and draft review prompts present");
  const review = (await client.getPrompt({ name: "review_draft" })).messages[0].content.text;
  assert(review.includes("Wait for their actual answer") && review.includes("accept / reject / modify / pending"), "review prompt waits for author decisions and preserves pending choices");
  assert(review.includes("Save the note to a file only if") && review.includes("Never automatically rewrite"), "review prompt requires explicit file/edit requests");

  for (const invalid of [
    {}, { profileMarkdown: " ", work: "draft" }, { profileMarkdown: "profile", work: " " },
    { profileMarkdown: "p".repeat(20_001), work: "draft" },
    { profileMarkdown: "profile", work: "w".repeat(8_001) },
    { profileMarkdown: "profile", work: "draft", question: "q".repeat(501) },
  ]) {
    const result = await client.callTool({ name: "critique", arguments: invalid });
    assert(result.isError, "critique rejects invalid source boundaries before generation");
  }

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

  // Pressure rounds are discoverable (so an agent can actually run the test).
  const rounds = JSON.parse((await client.callTool({ name: "get_pressure_rounds", arguments: {} })).content[0].text);
  assert(rounds.rounds.length === 10 && rounds.rounds[0].choices.length === 4, "get_pressure_rounds exposes 10 rounds × 4 choices");
  // Unknown ids are rejected, not silently empty.
  const badSel = await client.callTool({ name: "selector_pressure_test", arguments: { choices: [{ roundId: "poster-line", choiceId: "nope" }] } });
  assert(badSel.isError && badSel.content[0].text.includes("Unknown"), "selector_pressure_test rejects unknown ids");

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

  // Each client gets only its direct export, even after another client's export.
  await secondClient.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT)));
  const secondExport = await secondClient.callTool({ name: "export_profile", arguments: { owner: "Second author", notes: "SECOND_CLIENT_PRIVATE_MARKER" } });
  assert(secondExport.content[0].text.includes("SECOND_CLIENT_PRIVATE_MARKER"), "second client receives its own direct export");
  assert(!JSON.stringify(exported).includes("SECOND_CLIENT_PRIVATE_MARKER"), "first client's direct export remains unchanged");
  assert(JSON.parse(secondExport.content[1].text).owner === "Second author", "direct JSON export is preserved");
  for (const connection of [client, secondClient]) {
    await assertStrict.rejects(connection.readResource({ uri: "wedges://profile" }), (error) => {
      assertStrict.equal(error.code, -32602);
      assertStrict.match(error.message, /not found/i);
      assertStrict.doesNotMatch(error.message, /SECOND_CLIENT_PRIVATE_MARKER|Taste Profile/);
      return true;
    });
  }
  assert(true, "neither client can retrieve an export through the removed resource");

  // No valid LLM tool is called by default, regardless of client or server keys.
  if (useLlm) {
    const mb = await client.callTool({
      name: "mirror_booth",
      arguments: {
        paragraph: "We shot the whole thing on a borrowed Bolex in my nonna's kitchen in East Van, the light going amber through the cheap curtains while she rolled gnocchi and refused to look at the lens.",
        ...(process.env.ANTHROPIC_API_KEY ? { anthropic_api_key: process.env.ANTHROPIC_API_KEY } : {}),
      },
    });
    assert(!mb.isError, "mirror_booth opt-in model call succeeded");
    const parsed = JSON.parse(mb.content[0].text);
    assert(typeof parsed.mirrored === "string" && parsed.preserved.length >= 2, "mirror_booth returned a valid structured result");
  } else {
    console.log("Model checks skipped; use --llm to opt in. Critique quality eval: npm run eval:critique -- --llm.");
  }
  console.log("\nAll smoke checks passed.");
} finally {
  await Promise.all([client.close(), secondClient.close()]);
}
