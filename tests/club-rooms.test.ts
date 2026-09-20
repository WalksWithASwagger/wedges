import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { createRequire } from "node:module";
import { POST as createRoom } from "@/app/api/club/rooms/route";
import { DELETE, GET } from "@/app/api/club/rooms/[code]/route";
import { POST as joinRoom } from "@/app/api/club/rooms/[code]/join/route";
import { POST as submitWork } from "@/app/api/club/rooms/[code]/submit/route";
import { createClubStore, MAX_MEMBERS, replaceStoreForTests, type ClubStore } from "@/lib/club/store";
import type { Member, Room } from "@/lib/club/types";

const require = createRequire(import.meta.url);

function member(id: string, extras: Partial<Member> = {}): Member {
  return { id, name: id, token: `${id}-token`, profileMarkdown: "", joinedAt: 1, ...extras };
}

function room(code: string, extras: Partial<Room> = {}): Room {
  return {
    code,
    title: "Route room",
    createdAt: 1,
    ownerToken: "owner",
    members: [],
    submissions: [],
    ...extras,
  };
}

type CookieJar = { get: (name: string) => { value: string } | undefined; set: (...args: unknown[]) => void };

function mockCookies(jars: CookieJar[]) {
  const queue = [...jars];
  mock.method(require("next/headers"), "cookies", async () => {
    const next = queue.shift();
    if (!next) throw new Error("cookie jar exhausted");
    return next;
  });
}

function mockCookieMap(values: Record<string, string>) {
  mock.method(require("next/headers"), "cookies", async () => ({
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
    set(name: string, value: string) {
      values[name] = value;
    },
  }));
}

function jar(value?: string): CookieJar {
  return {
    get: () => (value ? { value } : undefined),
    set() {},
  };
}

function params(code: string) {
  return { params: Promise.resolve({ code }) };
}

function jsonRequest(url: string, body: unknown, ip = "203.0.113.10") {
  return new Request(url, {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

let store: ClubStore;

beforeEach(() => {
  store = createClubStore();
  replaceStoreForTests(store);
});

afterEach(() => {
  replaceStoreForTests(null);
  mock.restoreAll();
});

test("create route uses create-if-absent and reports bounded collisions", async () => {
  mockCookieMap({});
  const created = await createRoom(jsonRequest("http://localhost/api/club/rooms", { title: "New room" }));
  assert.equal(created.status, 200);
  const { code } = await created.json();
  const stored = await store.get(code);
  assert.equal(stored?.title, "New room");
  assert.deepEqual(stored?.members, []);
  assert.deepEqual(stored?.submissions, []);

  replaceStoreForTests({
    ...store,
    createIfAbsent: async () => ({ ok: false, error: "conflict" }),
  });
  const collided = await createRoom(jsonRequest("http://localhost/api/club/rooms", { title: "Taken" }));
  assert.equal(collided.status, 409);
  assert.equal((await collided.json()).error, "conflict");
});

test("GET returns a public snapshot and does not expose owner or member tokens", async () => {
  await store.createIfAbsent(room("get-room", { members: [member("ada", { token: "secret-token", profileMarkdown: "private" })] }));
  const response = await GET(new Request("http://localhost"), params("get-room"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.code, "get-room");
  assert.equal(body.members[0].hasProfile, true);
  assert.equal("ownerToken" in body, false);
  assert.equal("token" in body.members[0], false);
  assert.equal("profileMarkdown" in body.members[0], false);
});

test("concurrent join routes keep both members", async () => {
  await store.createIfAbsent(room("join-join"));
  mockCookies([jar(), jar()]);
  const [left, right] = await Promise.all([
    joinRoom(jsonRequest("http://localhost/join", { name: "Ada" }), params("join-join")),
    joinRoom(jsonRequest("http://localhost/join", { name: "Bea" }), params("join-join")),
  ]);
  assert.equal(left.status, 200);
  assert.equal(right.status, 200);
  const stored = await store.get("join-join");
  assert.deepEqual(new Set(stored?.members.map((item) => item.name)), new Set(["Ada", "Bea"]));
});

test("duplicate member join updates one row through the route", async () => {
  await store.createIfAbsent(room("dup-join", { members: [member("ada", { name: "Ada" })] }));
  mockCookieMap({ "club_member_dup-join": "ada-token" });
  const [left, right] = await Promise.all([
    joinRoom(jsonRequest("http://localhost/join", { name: "Ada One" }), params("dup-join")),
    joinRoom(jsonRequest("http://localhost/join", { name: "Ada Two", profileMarkdown: "lens" }), params("dup-join")),
  ]);
  assert.equal(left.status, 200);
  assert.equal(right.status, 200);
  const stored = await store.get("dup-join");
  assert.equal(stored?.members.length, 1);
  assert.equal(stored?.members[0].id, "ada");
  assert.ok(stored?.members[0].name === "Ada One" || stored?.members[0].name === "Ada Two");
});

test("capacity race through the join route admits exactly one member", async () => {
  const seated = Array.from({ length: MAX_MEMBERS - 1 }, (_, index) => member(`m${index}`));
  await store.createIfAbsent(room("cap-join", { members: seated }));
  mockCookies([jar(), jar()]);
  const [left, right] = await Promise.all([
    joinRoom(jsonRequest("http://localhost/join", { name: "Last" }), params("cap-join")),
    joinRoom(jsonRequest("http://localhost/join", { name: "Overflow" }), params("cap-join")),
  ]);
  const statuses = [left.status, right.status].sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 409]);
  const stored = await store.get("cap-join");
  assert.equal(stored?.members.length, MAX_MEMBERS);
});

test("concurrent submit routes keep both drafts", async () => {
  await store.createIfAbsent(room("sub-sub", { members: [member("ada"), member("bea")] }));
  mockCookies([jar("ada-token"), jar("bea-token")]);
  const [left, right] = await Promise.all([
    submitWork(jsonRequest("http://localhost/submit", { title: "A", body: "Ada draft" }, "198.51.100.1"), params("sub-sub")),
    submitWork(jsonRequest("http://localhost/submit", { title: "B", body: "Bea draft" }, "198.51.100.2"), params("sub-sub")),
  ]);
  assert.equal(left.status, 200);
  assert.equal(right.status, 200);
  const stored = await store.get("sub-sub");
  assert.deepEqual(new Set(stored?.submissions.map((item) => item.body)), new Set(["Ada draft", "Bea draft"]));
});

test("join and submit routes interleave without dropping a write", async () => {
  await store.createIfAbsent(room("join-sub", { members: [member("ada")] }));
  mockCookies([jar(), jar("ada-token")]);
  const [joined, posted] = await Promise.all([
    joinRoom(jsonRequest("http://localhost/join", { name: "Bea" }), params("join-sub")),
    submitWork(jsonRequest("http://localhost/submit", { title: "A", body: "Ada draft" }, "198.51.100.3"), params("join-sub")),
  ]);
  assert.equal(joined.status, 200);
  assert.equal(posted.status, 200);
  const stored = await store.get("join-sub");
  assert.ok(stored?.members.some((item) => item.name === "Bea"));
  assert.equal(stored?.submissions[0].body, "Ada draft");
});

test("submit racing owner delete never resurrects the room", async () => {
  await store.createIfAbsent(room("sub-del", { members: [member("ada")] }));
  mockCookieMap({ "club_member_sub-del": "ada-token", "club_owner_sub-del": "owner" });
  const [posted, deleted] = await Promise.all([
    submitWork(jsonRequest("http://localhost/submit", { title: "Late", body: "Late draft" }, "198.51.100.4"), params("sub-del")),
    DELETE(new Request("http://localhost", { method: "DELETE" }), params("sub-del")),
  ]);
  assert.ok(posted.status === 200 || posted.status === 404);
  assert.ok(deleted.status === 200 || deleted.status === 404);
  assert.ok(posted.status === 200 || deleted.status === 200);
  const stored = await store.get("sub-del");
  if (deleted.status === 200) {
    assert.equal(stored, null);
  } else {
    assert.equal(posted.status, 200);
    assert.equal(stored?.submissions[0].body, "Late draft");
  }
  if (stored === null) {
    const after = await submitWork(jsonRequest("http://localhost/submit", { title: "Ghost", body: "Should not land" }, "198.51.100.5"), params("sub-del"));
    assert.equal(after.status, 404);
    assert.equal(await store.get("sub-del"), null);
  }
});

test("storage unavailable returns a safe error without writing", async () => {
  replaceStoreForTests({
    get: async () => null,
    createIfAbsent: async () => ({ ok: false, error: "unavailable" }),
    joinMember: async () => ({ ok: false, error: "unavailable" }),
    appendSubmission: async () => ({ ok: false, error: "unavailable" }),
    deleteIfOwner: async () => ({ ok: false, error: "unavailable" }),
  });
  mockCookieMap({ club_owner_missing: "owner", club_member_missing: "ada-token" });
  const deleted = await DELETE(new Request("http://localhost", { method: "DELETE" }), params("missing"));
  const posted = await submitWork(jsonRequest("http://localhost/submit", { title: "X", body: "Y" }), params("missing"));
  const joined = await joinRoom(jsonRequest("http://localhost/join", { name: "Ada" }), params("missing"));
  assert.equal(deleted.status, 503);
  assert.equal(posted.status, 503);
  assert.equal(joined.status, 503);
  assert.equal((await deleted.json()).message.includes("unavailable"), true);
});
