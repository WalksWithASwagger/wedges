import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { sources, critique } from "../fixtures/review";
import { createReviewRecord, exportReviewJson } from "../../lib/review-record";

async function saved(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: "Saved locally." })).toBeVisible();
}
async function entries(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("wedges-reviews", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<Array<{ id: string; revision: number; predecessorId: string | null; draft: { title: string; sources: { work: string }; record: { revisedWork: string } | null } }>>((resolve, reject) => {
      const request = db.transaction("items").objectStore("items").getAll();
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  });
}
async function importRecord(page: Page) {
  await page.getByLabel("Open review JSON file").setInputFiles({ name: "same-name.json", mimeType: "application/json", buffer: Buffer.from(exportReviewJson(createReviewRecord(sources, critique))) });
  await expect(page.getByLabel("Your working revision")).toBeVisible();
  await saved(page);
}

test("partial drafts recover locally, with title, keyboard focus and no model request", async ({ page }, testInfo) => {
  let requests = 0;
  await page.route("**/api/mcp", async (route) => { requests++; await route.abort(); });
  await page.goto("/review");
  await page.getByLabel("Work title").fill("A half-finished thought");
  await page.getByLabel("The unfinished thing").fill("Only a fragment — no taste yet.");
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("Only a fragment — no taste yet.");
  await expect(page.getByLabel("The unfinished thing")).toBeFocused();
  await expect(page.getByLabel("Work title")).toHaveValue("A half-finished thought");
  await expect(page.getByLabel("The taste to protect")).toHaveValue("");
  await page.getByLabel("The unfinished thing").fill("x".repeat(8_001));
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("x".repeat(8_001));
  await page.getByText("Recent work (1)", { exact: true }).click();
  expect(requests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("local-library.png"), fullPage: true });
});

test("import isolates filenames; revision lineage and original decisions are retained", async ({ page }) => {
  await page.goto("/review");
  await importRecord(page);
  const first = (await entries(page))[0];
  await page.getByLabel("Your reason").first().fill("r".repeat(2_001));
  await page.getByLabel("Your working revision").fill("w".repeat(8_001));
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("Your reason").first()).toHaveValue("r".repeat(2_001));
  await expect(page.getByLabel("Your working revision")).toHaveValue("w".repeat(8_001));
  await page.getByRole("radio", { name: "Reject", exact: true }).first().check();
  await page.getByLabel("Your reason").first().fill("Keep the awkward edge.");
  await page.getByLabel("Your working revision").fill("The author writes this revision.");
  await saved(page);
  await page.reload();
  await expect(page.getByRole("radio", { name: "Reject", exact: true }).first()).toBeChecked();
  await expect(page.getByLabel("Your reason").first()).toHaveValue("Keep the awkward edge.");
  await page.getByRole("button", { name: "Review your revision", exact: true }).click();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("The author writes this revision.");
  await saved(page);
  let all = await entries(page);
  expect(all).toHaveLength(2);
  expect(all.find((item) => item.id !== first.id)?.predecessorId).toBe(first.id);
  expect(all.find((item) => item.id === first.id)?.draft.record?.revisedWork).toBe("The author writes this revision.");
  await importRecord(page);
  all = await entries(page);
  expect(all).toHaveLength(3);
  expect(all.filter((item) => item.draft.title === "same-name")).toHaveLength(2);
});

test("new work flushes the previous item and library opening works by keyboard", async ({ page }) => {
  await page.goto("/review");
  await page.getByLabel("Work title").fill("First work");
  await page.getByLabel("The unfinished thing").fill("Keep me across a transition.");
  await page.getByRole("button", { name: "Start new work", exact: true }).click();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("");
  await saved(page);
  await page.getByText("Recent work (2)", { exact: true }).click();
  await page.getByRole("button", { name: /First work Saved/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("Keep me across a transition.");
  await expect(page.getByLabel("The unfinished thing")).toBeFocused();
});

test("a stale tab cannot overwrite newer edits; copy and reload resolve explicitly", async ({ page, context }) => {
  await page.goto("/review");
  await page.getByLabel("The unfinished thing").fill("Initial draft");
  await saved(page);
  const second = await context.newPage();
  await second.goto("/review");
  await expect(second.getByLabel("The unfinished thing")).toHaveValue("Initial draft");
  await page.getByLabel("The unfinished thing").fill("Newer in the first tab");
  await saved(page);
  await second.getByLabel("The unfinished thing").fill("Second tab's own path");
  await expect(second.getByRole("status").filter({ hasText: "another tab changed" })).toBeVisible();
  expect((await entries(page))[0].draft.sources.work).toBe("Newer in the first tab");
  await second.getByRole("button", { name: "Keep as copy", exact: true }).click();
  await saved(second);
  expect((await entries(page)).map((item) => item.draft.sources.work).sort()).toEqual(["Newer in the first tab", "Second tab's own path"]);
  await page.getByLabel("The unfinished thing").fill("A third version");
  await saved(page);
  const third = await context.newPage();
  await third.goto("/review");
  await expect(third.getByLabel("The unfinished thing")).toHaveValue("A third version");
  await page.getByLabel("The unfinished thing").fill("The saved fourth version");
  await saved(page);
  await third.getByLabel("The unfinished thing").fill("Discard this explicit conflict");
  await expect(third.getByRole("button", { name: "Reload saved version" })).toBeVisible();
  third.once("dialog", (dialog) => dialog.accept());
  await third.getByRole("button", { name: "Reload saved version" }).click();
  await expect(third.getByLabel("The unfinished thing")).toHaveValue("The saved fourth version");
});

test("deletion is confirmed, scoped and cannot be undone by a stale tab", async ({ page, context }) => {
  await page.goto("/review");
  await page.getByLabel("The unfinished thing").fill("Delete only this item");
  await saved(page);
  await page.evaluate(() => localStorage.setItem("unrelated", "keep"));
  const second = await context.newPage();
  await second.goto("/review");
  await expect(second.getByLabel("The unfinished thing")).toHaveValue("Delete only this item");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete local item" }).click();
  expect(await entries(page)).toHaveLength(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete local item" }).click();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("");
  expect(await entries(page)).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe("keep");
  await second.getByLabel("The unfinished thing").fill("A stale edit");
  await expect(second.getByRole("status").filter({ hasText: "another tab changed or deleted" })).toBeVisible();
  expect(await entries(page)).toHaveLength(0);
});

for (const failure of ["denied", "quota"] as const) {
  test(`${failure} storage keeps the session usable with a draft download`, async ({ page }) => {
    await page.addInitScript((kind) => {
      const open = IDBFactory.prototype.open;
      const put = IDBObjectStore.prototype.put;
      (window as unknown as { restoreStorage: () => void }).restoreStorage = () => { IDBFactory.prototype.open = open; IDBObjectStore.prototype.put = put; };
      if (kind === "denied") IDBFactory.prototype.open = () => { throw new DOMException("Denied", "SecurityError"); };
      else IDBObjectStore.prototype.put = () => { throw new DOMException("Full", "QuotaExceededError"); };
    }, failure);
    await page.goto("/review");
    await page.getByLabel("The unfinished thing").fill("Partial private text remains here");
    await expect(page.getByRole("status").filter({ hasText: "Unsaved: browser storage" })).toBeVisible();
    await expect(page.getByLabel("The unfinished thing")).toHaveValue("Partial private text remains here");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download draft text" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("wedges-draft.txt");
    expect(JSON.parse(await readFile((await file.path())!, "utf8")).sources.work).toBe("Partial private text remains here");
    await page.getByRole("button", { name: "Start new work", exact: true }).click();
    await expect(page.getByLabel("The unfinished thing")).toHaveValue("Partial private text remains here");
    await page.getByRole("link", { name: "Wedges", exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);
    await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
    await page.getByRole("button", { name: "Retry local save" }).click();
    await saved(page);
    expect((await entries(page))[0].draft.sources.work).toBe("Partial private text remains here");
  });
}

test("corrupt and unknown local items stay untouched while valid work recovers", async ({ page }) => {
  await page.goto("/review");
  await page.getByLabel("The unfinished thing").fill("Recover the valid draft");
  await saved(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.open("wedges-reviews", 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("items", "readwrite");
        transaction.objectStore("items").put({ id: "corrupt", version: 1, draft: null });
        transaction.objectStore("items").put({ id: "future", version: 99 });
        transaction.oncomplete = () => { db.close(); resolve(); };
      };
    });
  });
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "2 unreadable" })).toBeVisible();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("Recover the valid draft");
  expect(await entries(page)).toHaveLength(3);
});

test("unavailable storage permits an explicit export then session-only revision journey", async ({ page }) => {
  await page.addInitScript(() => { IDBFactory.prototype.open = () => { throw new DOMException("Denied", "SecurityError"); }; });
  await page.goto("/review");
  await page.getByLabel("Open review JSON file").setInputFiles({ name: "review.json", mimeType: "application/json", buffer: Buffer.from(exportReviewJson(createReviewRecord(sources, critique))) });
  await expect(page.getByLabel("Your working revision")).toHaveValue(sources.work);
  await page.getByLabel("Your working revision").fill("The session-only revision");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON · reopen later" }).click();
  const exported = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  expect(exported.revisedWork).toBe("The session-only revision");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Review your revision" }).click();
  await expect(page.getByLabel("Your working revision")).toHaveValue("The session-only revision");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Review your revision" }).click();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("The session-only revision");
  await expect(page.getByRole("status").filter({ hasText: "Unsaved: browser storage" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start new work", exact: true }).click();
  await expect(page.getByLabel("The unfinished thing")).toHaveValue("");
  await expect(page.getByRole("status").filter({ hasText: "Unsaved: browser storage" })).toBeVisible();
});
