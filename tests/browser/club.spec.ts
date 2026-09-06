import { test, expect } from "@playwright/test";

const room = {
  code: "test-room", title: "Draft room", createdAt: 1,
  members: [{ id: "author", name: "Author", hasProfile: false }],
  submissions: [{ id: "old", memberId: "author", authorName: "Author", title: "Old draft", body: "Original work", createdAt: 1,
    critiques: [{ fromMemberId: "lens", fromName: "Alex", text: "Cut the opening.", wouldShip: "ship", createdAt: 1 }] },
    { id: "new", memberId: "author", authorName: "Author", title: "New draft", body: "Shared work", createdAt: 2, critiques: [] }],
};

test("Club preserves failed drafts and labels legacy AI without member endorsement", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("club_test-room", JSON.stringify({ memberId: "author", name: "Author" })));
  await page.route("**/api/club/rooms/test-room", (route) => route.fulfill({ json: room }));
  let attempt = 0;
  await page.route("**/api/club/rooms/test-room/submit", (route) => {
    attempt++;
    if (attempt === 1) return route.abort();
    if (attempt === 2) return route.fulfill({ status: 400, json: { message: "Keep work to 8,000 characters or fewer." } });
    return route.fulfill({ json: { id: "posted" } });
  });
  await page.goto("/club/test-room");
  await expect(page.getByText("Legacy AI-generated feedback", { exact: true })).toBeVisible();
  await expect(page.getByText(/profile supplied for Alex/)).toBeVisible();
  await expect(page.getByText("Cut the opening.")).toBeVisible();
  await expect(page.getByText(/would ship/)).toHaveCount(0);
  await expect(page.getByText(/Shared for the room to read/)).toBeVisible();
  const title = page.getByRole("textbox", { name: "Title (optional)" });
  const work = page.getByRole("textbox", { name: "Work", exact: true });
  const submit = page.getByRole("button", { name: "Drop it" });
  await title.fill("Kept title");
  await work.fill("Kept draft");
  await work.press("Tab");
  await expect(submit).toBeFocused();
  await submit.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Couldn't confirm");
  await expect(work).toHaveValue("Kept draft");
  await expect(title).toHaveValue("Kept title");
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("8,000");
  await expect(work).toHaveValue("Kept draft");
  await submit.click();
  await expect(work).toHaveValue("");
  await expect(title).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("club.png"), fullPage: true });
});

test("Club loading failure retries into an honest optional-profile join state", async ({ page }) => {
  let failed = true;
  await page.route("**/api/club/rooms/test-room", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return route.fulfill(failed ? { status: 503, body: "Unavailable" } : { json: { ...room, members: [], submissions: [] } });
  });
  await page.goto("/club/test-room");
  await expect(page.getByRole("status")).toContainText("Loading room");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("refresh");
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/No profile needed to join/)).toBeVisible();
  await expect(page.getByText(/No one’s joined yet/)).toBeVisible();
});
