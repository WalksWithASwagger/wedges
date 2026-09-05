import assert from "node:assert/strict";
import { test } from "node:test";
import { APICallError } from "ai";
import { toolError, WedgesError } from "@/lib/errors";

test("upstream fallback errors never return private payloads", () => {
  const privateMarker = "PRIVATE_DRAFT_AND_CREDENTIAL_SENTINEL";
  for (const error of [
    new Error(privateMarker),
    new APICallError({
      message: privateMarker,
      url: "https://example.invalid",
      requestBodyValues: { profile: privateMarker },
      statusCode: 400,
      responseBody: privateMarker,
    }),
  ]) {
    assert.equal(JSON.stringify(toolError(error)).includes(privateMarker), false);
  }
});

test("safe error categories and intentional validation messages survive", () => {
  for (const [statusCode, kind] of [[401, "invalid_key"], [408, "timeout"], [429, "rate_limited"], [413, "oversized"], [500, "model_error"]] as const) {
    const result = toolError(new APICallError({
      message: "private upstream response", url: "https://example.invalid", requestBodyValues: {}, statusCode,
    }));
    assert.match(result.content[0].text, new RegExp(`^\\[${kind}\\]`));
  }
  assert.equal(toolError(new WedgesError("invalid_input", "Choose a draft.")).content[0].text, "[invalid_input] Choose a draft.");
});
