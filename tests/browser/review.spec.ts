import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { sources, critique } from "../fixtures/review";
import { createReviewRecord, exportReviewJson } from "../../lib/review-record";

async function mockCritique(page: Page, result: unknown = critique, toolError = false, delay = 0) {
  const calls: unknown[] = [];
  await page.route("**/api/mcp", async (route) => {
    if (route.request().method() !== "POST") { await route.fulfill({ status: 405 }); return; }
    const message = route.request().postDataJSON();
    if (message.method === "notifications/initialized") { await route.fulfill({ status: 202 }); return; }
    if (message.method === "tools/call") {
      calls.push(message.params);
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({ json: { jsonrpc: "2.0", id: message.id, result: message.method === "initialize"
      ? { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "browser-fixture", version: "1" } }
      : { ...(toolError ? { isError: true } : {}), content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }] } } });
  });
  return calls;
}

async function fillSources(page: Page) {
  await page.getByLabel("The unfinished thing").fill(sources.work);
  await page.getByLabel("The taste to protect").fill(sources.profileMarkdown);
  await page.getByLabel("What should the review look at?").fill(sources.question);
}

test("author decisions never apply edits; sources and decisions survive export and reopening", async ({ page }, testInfo) => {
  const calls = await mockCritique(page);
  await page.goto("/review");
  await fillSources(page);
  await page.getByRole("button", { name: "Get cited critique ◣" }).click();
  const revision = page.getByLabel("Your working revision");
  await expect(revision).toHaveValue(sources.work);
  await expect(page.getByRole("heading", { name: "Your work. Your call." })).toBeFocused();
  const first = page.getByRole("article", { name: "Suggestion 1", exact: true });
  await first.getByRole("radio", { name: "Accept", exact: true }).check();
  await expect(revision).toHaveValue(sources.work);
  await first.getByRole("radio", { name: "Reject", exact: true }).check();
  await first.getByLabel("Your reason").fill("This is deliberate parody.\n");
  await revision.fill("My revision — é 🎞️\n");
  await page.getByText("Original draft & taste — fixed for this review").click();
  await expect(page.locator("pre").first()).toHaveText(sources.work);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON · reopen later" }).click();
  const file = await download;
  const text = await readFile((await file.path())!, "utf8");
  const record = JSON.parse(text);
  expect(record.sources).toEqual(sources);
  expect(record.decisions).toEqual([{ status: "reject", reason: "This is deliberate parody.\n" }, { status: "pending", reason: "" }]);
  await page.reload();
  await page.getByLabel("Open review JSON file").setInputFiles({ name: "review.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await expect(revision).toHaveValue("My revision — é 🎞️\n");
  await expect(first.getByRole("radio", { name: "Reject", exact: true })).toBeChecked();
  expect(calls).toEqual([{ name: "critique", arguments: sources }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("review.png"), fullPage: true });
});

test("actual browser-to-server MCP path returns a safe missing-key error without a model call", async ({ page }) => {
  await page.goto("/review");
  await fillSources(page);
  await page.getByRole("button", { name: "Get cited critique ◣" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("server has no model key");
  await expect(page.getByLabel("The unfinished thing")).toHaveValue(sources.work);
});

test("invalid, oversized and unsupported imports preserve current work; markup stays inert", async ({ page }) => {
  const calls = await mockCritique(page);
  await page.goto("/review");
  const original = createReviewRecord(sources, critique);
  original.revisedWork = "<img src=x onerror=alert('unsafe')> ```\n";
  const upload = page.getByLabel("Open review JSON file");
  await upload.setInputFiles({ name: "review.json", mimeType: "application/json", buffer: Buffer.from(exportReviewJson(original)) });
  await expect(page.getByLabel("Your working revision")).toHaveValue(original.revisedWork);
  for (const contents of ["bad json", JSON.stringify({ ...original, version: 2 }), "x".repeat(512 * 1024 + 1)]) {
    await upload.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from(contents) });
    await expect(page.getByRole("main").getByRole("alert")).toContainText("current work is unchanged");
    await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
    await expect(page.getByLabel("Your working revision")).toHaveValue(original.revisedWork);
  }
  await expect(page.locator("img")).toHaveCount(0);
  expect(calls).toHaveLength(0);
});

test("pending requests block duplicates; safe rate-limit errors retain and export the draft", async ({ page }) => {
  const calls = await mockCritique(page, "[rate_limited] PRIVATE_PROVIDER_PAYLOAD", true, 500);
  await page.goto("/review");
  await fillSources(page);
  await page.getByRole("button", { name: "Get cited critique ◣" }).click();
  await expect(page.getByRole("button", { name: "Reading…", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Open review JSON", exact: true })).toBeDisabled();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("rate-limited");
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText("PRIVATE");
  await expect(page.getByLabel("The unfinished thing")).toHaveValue(sources.work);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON · reopen later" }).click();
  const file = await download;
  expect(JSON.parse(await readFile((await file.path())!, "utf8")).critique).toBeNull();
  expect(calls).toHaveLength(1);
});

test("insufficient evidence has no forced decisions and stays editable", async ({ page }) => {
  await mockCritique(page, { ...critique, status: "insufficient_evidence", suggestions: [], explanation: "The profile does not support a useful change." });
  await page.goto("/review");
  await fillSources(page);
  await page.getByRole("button", { name: "Get cited critique ◣" }).click();
  await expect(page.getByText("No supported suggestions.", { exact: false })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByLabel("Your working revision").fill("My decision is to keep writing.");
});

test("keyboard review, decisions and export remain usable at zoom", async ({ page }) => {
  await mockCritique(page);
  await page.goto("/review");
  await page.getByLabel("The unfinished thing").focus();
  await page.keyboard.insertText(sources.work);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("The taste to protect")).toBeFocused();
  await page.keyboard.insertText(sources.profileMarkdown);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Import taste text", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.insertText(sources.question);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Get cited critique ◣" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Your working revision")).toBeVisible();
  const pending = page.getByRole("article", { name: "Suggestion 1", exact: true }).getByRole("radio", { name: "Pending" });
  await pending.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("article", { name: "Suggestion 1", exact: true }).getByRole("radio", { name: "Accept", exact: true })).toBeChecked();
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown · read anywhere" }).focus();
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toBe("wedges-review.md");
});

test("oversized input is rejected without truncation or network calls", async ({ page }) => {
  const calls = await mockCritique(page);
  await page.goto("/review");
  await fillSources(page);
  await page.getByLabel("The unfinished thing").fill("x".repeat(8_001));
  await page.getByRole("button", { name: "Get cited critique ◣" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Nothing has been shortened");
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("x".repeat(8_001));
  expect(calls).toHaveLength(0);
});
