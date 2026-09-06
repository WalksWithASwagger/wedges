import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { getStore } from "@/lib/club/store";
import { POST } from "@/app/api/club/rooms/[code]/submit/route";
import type { Room } from "@/lib/club/types";

const require = createRequire(import.meta.url);

test("Club posting preserves full work, generates no feedback and rejects overflow before writing", async (t) => {
  t.mock.method(require("next/headers"), "cookies", async () => ({ get: () => ({ value: "author-token" }) }));
  let providerCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { providerCalls++; throw new Error("Provider must not be called"); });
  const room: Room = { code: "test-club", title: "Test", createdAt: 1, ownerToken: "owner", members: [
    { id: "author", name: "Author", token: "author-token", profileMarkdown: "", joinedAt: 1 },
    ...["A", "B"].map((name) => ({ id: name, name, token: name, profileMarkdown: "Prefer concrete detail", joinedAt: 1 })),
  ], submissions: [] };
  const store = getStore();
  await store.set(room);
  const post = (body: string) => POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ title: "Draft", body }) }), { params: Promise.resolve({ code: room.code }) });
  const work = "x".repeat(8000);
  const response = await post(work);
  assert.equal(response.status, 200);
  const submission = await response.json();
  assert.equal(submission.body, work);
  assert.deepEqual(submission.critiques, []);
  assert.equal(providerCalls, 0);
  assert.equal((await post(work + "x")).status, 400);
  assert.equal((await post("   ")).status, 400);
  assert.equal((await store.get(room.code))?.submissions.length, 1);
  assert.equal((await store.get(room.code))?.submissions[0].body, work);
});
