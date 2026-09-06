import assert from "node:assert/strict";
import { test } from "node:test";
import { createReviewRecord, exportReviewJson, exportReviewMarkdown, MAX_RECORD_BYTES, parseReviewRecord } from "@/lib/review-record";
import { critique, sources } from "./fixtures/review";

test("review snapshots, pending decisions, and Unicode survive JSON round-trip without a model", () => {
  const input = { ...sources, work: sources.work + "é 漢字 🎞️\r\n\t" };
  const record = createReviewRecord(input, critique);
  input.work = "changed after submission";
  record.decisions[0] = { status: "reject", reason: "  This is deliberate parody.\n" };
  record.revisedWork = "My own revision — 🎞️\n";
  assert.deepEqual(parseReviewRecord(exportReviewJson(record)), record);
  assert.match(record.sources.work, /é 漢字 🎞️\r\n\t$/);
  assert.deepEqual(record.decisions[1], { status: "pending", reason: "" });
  const before = record.revisedWork;
  record.decisions[0].status = "accept";
  assert.equal(record.revisedWork, before);
});

test("draft-only and insufficient-evidence records remain portable", () => {
  const draft = createReviewRecord(sources);
  assert.equal(parseReviewRecord(exportReviewJson(draft)).critique, null);
  assert.deepEqual(draft.decisions, []);
  const insufficient = createReviewRecord(sources, { ...critique, status: "insufficient_evidence", suggestions: [] });
  assert.deepEqual(parseReviewRecord(exportReviewJson(insufficient)), insufficient);
});

test("imports reject unsupported versions, altered citations, invalid decisions, extra keys, and size overflow", () => {
  const record = createReviewRecord(sources, critique);
  for (const mutate of [
    (r: typeof record) => ({ ...r, version: 2 }),
    (r: typeof record) => ({ ...r, decisions: [] }),
    (r: typeof record) => ({ ...r, decisions: [{ status: "approved", reason: "" }, r.decisions[1]] }),
    (r: typeof record) => ({ ...r, sources: { ...r.sources, work: "other draft" } }),
    (r: typeof record) => ({ ...r, apiKey: "unwanted-field" }),
    (r: typeof record) => ({ ...r, critique: { ...r.critique, interpretation: "Human endorsement" } }),
    (r: typeof record) => ({ ...r, revisedWork: "x".repeat(8_001) }),
  ]) assert.throws(() => parseReviewRecord(JSON.stringify(mutate(record))), /not a valid Wedges review/);
  assert.throws(() => parseReviewRecord("not json"), /current work is unchanged/);
  assert.throws(() => parseReviewRecord(" ".repeat(MAX_RECORD_BYTES + 1)), /512 KB/);
  assert.throws(() => parseReviewRecord("🎞️".repeat(MAX_RECORD_BYTES / 4)), /512 KB/);
  assert.equal(record.sources.work, sources.work);
});

test("Markdown quotes untrusted content in fences and distinguishes AI reasoning from author decisions", () => {
  const record = createReviewRecord(sources, critique);
  record.revisedWork = "```\n<script>alert('x')</script>\n# Fake heading\n```";
  record.decisions[0] = { status: "modify", reason: "Use my own edit.\n" };
  const markdown = exportReviewMarkdown(record);
  assert.match(markdown, /````text\n```\n<script>/);
  assert.match(markdown, /Author decision: \*\*pending\*\*/);
  assert.match(markdown, /No reason supplied/);
  assert.match(markdown, /AI reasoning:/);
  assert.match(markdown, /Use my own edit/);
  assert.match(markdown, /Accepting a suggestion does not apply an edit/);
});

test("largest valid records fit the import envelope; exports reject overflow without shortening", () => {
  const record = createReviewRecord({ profileMarkdown: "\u0000".repeat(20_000), work: "\u0000".repeat(8_000), question: "\u0000".repeat(500) });
  const json = exportReviewJson(record);
  assert.ok(new TextEncoder().encode(json).length < MAX_RECORD_BYTES);
  assert.deepEqual(parseReviewRecord(json), record);
  record.revisedWork += "x";
  assert.throws(() => exportReviewJson(record));
  assert.equal(record.revisedWork.length, 8_001);
});
