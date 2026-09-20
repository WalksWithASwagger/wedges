import assert from "node:assert/strict";
import { after, test } from "node:test";
import { Redis } from "@upstash/redis";
import { createClubStore, MAX_MEMBERS, type ClubStore } from "@/lib/club/store";
import type { Member, Room, Submission } from "@/lib/club/types";

function member(id: string, extras: Partial<Member> = {}): Member {
  return { id, name: id, token: `${id}-token`, profileMarkdown: "", joinedAt: 1, ...extras };
}

function room(code: string, extras: Partial<Room> = {}): Room {
  return {
    code,
    title: "Atomic room",
    createdAt: 1,
    ownerToken: "owner",
    members: [],
    submissions: [],
    ...extras,
  };
}

function submissionInput(storeCode: string, author: Member, body: string, id = body) {
  return { code: storeCode, memberToken: author.token, id, title: body, body, createdAt: 1 };
}

async function seed(store: ClubStore, seeded: Room) {
  const created = await store.createIfAbsent(seeded);
  assert.equal(created.ok, true);
  return created.ok ? created.room : seeded;
}

function describeStore(label: string, makeStore: () => ClubStore, cleanup?: (store: ClubStore, codes: string[]) => Promise<void>) {
  const codes: string[] = [];
  const nextCode = (suffix: string) => {
    const code = `${label.slice(0, 3)}-${suffix}-${Math.random().toString(36).slice(2, 8)}`;
    codes.push(code);
    return code;
  };

  test(`${label}: snapshots are detached from stored state`, async () => {
    const store = makeStore();
    const code = nextCode("detach");
    await seed(store, room(code, { title: "Original", members: [member("a")] }));
    const first = await store.get(code);
    assert.ok(first);
    first.title = "Mutated in test";
    first.members[0].name = "rewritten";
    first.submissions.push({
      id: "ghost",
      memberId: "a",
      authorName: "a",
      title: "ghost",
      body: "ghost",
      createdAt: 1,
      critiques: [],
    });
    const second = await store.get(code);
    assert.equal(second?.title, "Original");
    assert.equal(second?.members[0].name, "a");
    assert.equal(second?.submissions.length, 0);
  });

  test(`${label}: create-if-absent is atomic and never overwrites`, async () => {
    const store = makeStore();
    const code = nextCode("create");
    const first = room(code, { title: "First", members: [member("kept")] });
    const second = room(code, { title: "Second", members: [member("lost")] });
    const [a, b] = await Promise.all([store.createIfAbsent(first), store.createIfAbsent(second)]);
    const wins = [a, b].filter((result) => result.ok);
    const conflicts = [a, b].filter((result) => !result.ok && result.error === "conflict");
    assert.equal(wins.length, 1);
    assert.equal(conflicts.length, 1);
    const stored = await store.get(code);
    assert.equal(stored?.title, wins[0].ok ? wins[0].room.title : "");
    assert.deepEqual(stored?.members.map((item) => item.id), wins[0].ok ? wins[0].room.members.map((item) => item.id) : []);
  });

  test(`${label}: concurrent joins keep both members`, async () => {
    const store = makeStore();
    const code = nextCode("join");
    await seed(store, room(code));
    const [left, right] = await Promise.all([
      store.joinMember({ code, name: "Ada", profileMarkdown: "", candidate: member("ada") }),
      store.joinMember({ code, name: "Bea", profileMarkdown: "", candidate: member("bea") }),
    ]);
    assert.equal(left.ok, true);
    assert.equal(right.ok, true);
    const stored = await store.get(code);
    assert.deepEqual(new Set(stored?.members.map((item) => item.id)), new Set(["ada", "bea"]));
  });

  test(`${label}: duplicate member updates stay one row`, async () => {
    const store = makeStore();
    const code = nextCode("dup");
    const existing = member("ada", { name: "Ada", profileMarkdown: "keep me" });
    await seed(store, room(code, { members: [existing] }));
    const [left, right] = await Promise.all([
      store.joinMember({
        code,
        memberToken: existing.token,
        name: "Ada One",
        profileMarkdown: "",
        candidate: member("other-1"),
      }),
      store.joinMember({
        code,
        memberToken: existing.token,
        name: "Ada Two",
        profileMarkdown: "new lens",
        candidate: member("other-2"),
      }),
    ]);
    assert.equal(left.ok, true);
    assert.equal(right.ok, true);
    const stored = await store.get(code);
    assert.equal(stored?.members.length, 1);
    assert.equal(stored?.members[0].id, "ada");
    assert.ok(stored?.members[0].name === "Ada One" || stored?.members[0].name === "Ada Two");
    assert.ok(stored?.members[0].profileMarkdown === "keep me" || stored?.members[0].profileMarkdown === "new lens");
  });

  test(`${label}: capacity race admits exactly one new member`, async () => {
    const store = makeStore();
    const code = nextCode("cap");
    const seated = Array.from({ length: MAX_MEMBERS - 1 }, (_, index) => member(`m${index}`));
    await seed(store, room(code, { members: seated }));
    const [left, right] = await Promise.all([
      store.joinMember({ code, name: "Last", profileMarkdown: "", candidate: member("last") }),
      store.joinMember({ code, name: "Overflow", profileMarkdown: "", candidate: member("overflow") }),
    ]);
    const accepted = [left, right].filter((result) => result.ok);
    const full = [left, right].filter((result) => !result.ok && result.error === "room_full");
    assert.equal(accepted.length, 1);
    assert.equal(full.length, 1);
    const stored = await store.get(code);
    assert.equal(stored?.members.length, MAX_MEMBERS);
  });

  test(`${label}: concurrent submissions keep every successful write`, async () => {
    const store = makeStore();
    const code = nextCode("sub");
    const author = member("ada");
    await seed(store, room(code, { members: [author] }));
    const [left, right] = await Promise.all([
      store.appendSubmission(submissionInput(code, author, "draft-a")),
      store.appendSubmission(submissionInput(code, author, "draft-b")),
    ]);
    assert.equal(left.ok, true);
    assert.equal(right.ok, true);
    const stored = await store.get(code);
    assert.deepEqual(new Set(stored?.submissions.map((item) => item.body)), new Set(["draft-a", "draft-b"]));
    assert.equal(stored?.submissions.every((item) => item.critiques.length === 0), true);
  });

  test(`${label}: join and submit interleave without losing either write`, async () => {
    const store = makeStore();
    const code = nextCode("mix");
    const author = member("ada");
    await seed(store, room(code, { members: [author] }));
    const [joined, posted] = await Promise.all([
      store.joinMember({ code, name: "Bea", profileMarkdown: "lens", candidate: member("bea") }),
      store.appendSubmission(submissionInput(code, author, "shared")),
    ]);
    assert.equal(joined.ok, true);
    assert.equal(posted.ok, true);
    const stored = await store.get(code);
    assert.deepEqual(new Set(stored?.members.map((item) => item.id)), new Set(["ada", "bea"]));
    assert.equal(stored?.submissions.length, 1);
    assert.equal(stored?.submissions[0].body, "shared");
  });

  test(`${label}: submit racing delete never resurrects a room`, async () => {
    const store = makeStore();
    const code = nextCode("del");
    const author = member("ada");
    await seed(store, room(code, { members: [author] }));
    const [posted, deleted] = await Promise.all([
      store.appendSubmission(submissionInput(code, author, "late")),
      store.deleteIfOwner(code, "owner"),
    ]);
    assert.equal(deleted.ok || posted.ok, true);
    const stored = await store.get(code);
    if (deleted.ok) {
      assert.equal(stored, null);
      if (posted.ok) {
        assert.equal((await store.get(code)) === null, true);
      }
    } else {
      assert.equal(posted.ok, true);
      assert.equal(stored?.submissions.length, 1);
      assert.equal(stored?.submissions[0].body, "late");
    }
    const resurrect = await store.appendSubmission(submissionInput(code, author, "after-delete"));
    if (stored === null) {
      assert.equal(resurrect.ok, false);
      assert.equal(resurrect.ok ? "" : resurrect.error, "not_found");
      assert.equal(await store.get(code), null);
    }
  });

  test(`${label}: delete and unauthorized submit do not write`, async () => {
    const store = makeStore();
    const code = nextCode("auth");
    await seed(store, room(code, { members: [member("ada")] }));
    const forbidden = await store.appendSubmission(submissionInput(code, member("stranger"), "nope"));
    assert.equal(forbidden.ok, false);
    assert.equal(forbidden.ok ? "" : forbidden.error, "forbidden");
    const denied = await store.deleteIfOwner(code, "wrong-owner");
    assert.equal(denied.ok, false);
    assert.equal(denied.ok ? "" : denied.error, "forbidden");
    const stored = await store.get(code);
    assert.equal(stored?.submissions.length, 0);
    assert.ok(stored);
  });

  test(`${label}: legacy members, submissions and critiques stay readable`, async () => {
    const store = makeStore();
    const code = nextCode("legacy");
    const critique = { fromMemberId: "b", fromName: "B", text: "Cut the last line.", wouldShip: "hold" as const, createdAt: 2 };
    const legacy: Submission = {
      id: "old",
      memberId: "a",
      authorName: "A",
      title: "Old draft",
      body: "Keep this exact body",
      createdAt: 1,
      critiques: [critique],
    };
    await seed(store, room(code, { members: [member("a"), member("b")], submissions: [legacy] }));
    const stored = await store.get(code);
    assert.deepEqual(stored?.submissions, [legacy]);
    assert.deepEqual(stored?.members.map((item) => item.id), ["a", "b"]);
  });

  if (cleanup) {
    after(async () => {
      await cleanup(makeStore(), codes);
    });
  }
}

describeStore("memory", () => createClubStore());

function redisTestStore(): ClubStore | null {
  const url = process.env.CLUB_TEST_REDIS_URL;
  const token = process.env.CLUB_TEST_REDIS_TOKEN;
  const namespace = process.env.CLUB_TEST_NAMESPACE;
  if (!url || !token || !namespace || namespace === "prod" || namespace === "production") return null;
  return createClubStore({
    redis: new Redis({ url, token, automaticDeserialization: false }),
    keyPrefix: `room:test:${namespace}:`,
  });
}

const isolatedRedis = redisTestStore();
if (isolatedRedis) {
  describeStore("redis-integration", () => isolatedRedis, async (store, codes) => {
    await Promise.all(codes.map((code) => store.deleteIfOwner(code, "owner")));
  });
} else {
  test("Redis integration remains unverified without CLUB_TEST_REDIS_URL, CLUB_TEST_REDIS_TOKEN and CLUB_TEST_NAMESPACE", () => {
    assert.equal(isolatedRedis, null);
  });
}
