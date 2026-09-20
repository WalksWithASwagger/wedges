import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { Member, Room, Submission } from "@/lib/club/types";

/**
 * Room store. Uses Upstash Redis when configured (production); falls back to an
 * in-memory map for local dev so the full flow is testable without provisioning.
 * Rooms persist until deleted — no TTL.
 *
 * Route consumers of the old whole-room write API (get/set/del), now replaced:
 *   GET    /api/club/rooms/[code]          -> get
 *   POST   /api/club/rooms                 -> createIfAbsent
 *   POST   /api/club/rooms/[code]/join     -> joinMember
 *   POST   /api/club/rooms/[code]/submit   -> appendSubmission
 *   DELETE /api/club/rooms/[code]          -> deleteIfOwner
 * Tests seed via createIfAbsent. set/del are no longer part of the write API.
 *
 * Redis mutations use official primitives: SET NX for create-if-absent, and a
 * bounded Lua compare-and-swap (createScript/EVALSHA) so JS keeps serializing
 * the existing room JSON shape. Lua does not re-encode rooms with cjson.
 */
export const MAX_MEMBERS = 12;
export const CREATE_CODE_ATTEMPTS = 5;
const CAS_ATTEMPTS = 8;
const DEFAULT_KEY_PREFIX = "room:";

export type StoreError = "not_found" | "forbidden" | "room_full" | "conflict" | "unavailable";

export type StoreResult<T> = ({ ok: true } & T) | { ok: false; error: StoreError };

export interface JoinMemberInput {
  code: string;
  memberToken?: string;
  name: string;
  profileMarkdown: string;
  candidate: Member;
}

export interface AppendSubmissionInput {
  code: string;
  memberToken: string;
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface ClubStore {
  get(code: string): Promise<Room | null>;
  createIfAbsent(room: Room): Promise<StoreResult<{ room: Room }>>;
  joinMember(input: JoinMemberInput): Promise<StoreResult<{ member: Member; room: Room }>>;
  appendSubmission(input: AppendSubmissionInput): Promise<StoreResult<{ submission: Submission; room: Room }>>;
  deleteIfOwner(code: string, ownerToken: string): Promise<StoreResult<{ deleted: true }>>;
}

export interface ClubStoreOptions {
  redis?: Redis;
  /** Override only for isolated tests. Production stays `room:`. */
  keyPrefix?: string;
}

export function storeStatus(error: StoreError): number {
  switch (error) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    case "room_full":
    case "conflict":
      return 409;
    case "unavailable":
      return 503;
  }
}

export function storeErrorMessage(error: StoreError): string {
  switch (error) {
    case "not_found":
      return "Room not found.";
    case "forbidden":
      return "Join the room before dropping work.";
    case "room_full":
      return "This room is full.";
    case "conflict":
      return "That change collided with another write. Try again.";
    case "unavailable":
      return "Film Club storage is unavailable. Try again shortly.";
  }
}

function cloneRoom(room: Room): Room {
  return structuredClone(room);
}

function roomKey(code: string, prefix: string): string {
  return `${prefix}${code}`;
}

function applyJoin(room: Room, input: JoinMemberInput): StoreResult<{ member: Member; room: Room }> {
  const existing = input.memberToken ? room.members.find((member) => member.token === input.memberToken) : undefined;
  if (existing) {
    existing.name = input.name;
    if (input.profileMarkdown) existing.profileMarkdown = input.profileMarkdown;
    return { ok: true, member: existing, room };
  }
  if (room.members.length >= MAX_MEMBERS) {
    return { ok: false, error: "room_full" };
  }
  const member: Member = {
    ...input.candidate,
    name: input.name,
    profileMarkdown: input.profileMarkdown,
  };
  room.members.push(member);
  return { ok: true, member, room };
}

function applyAppend(room: Room, input: AppendSubmissionInput): StoreResult<{ submission: Submission; room: Room }> {
  const author = room.members.find((member) => member.token === input.memberToken);
  if (!author) return { ok: false, error: "forbidden" };
  const submission: Submission = {
    id: input.id,
    memberId: author.id,
    authorName: author.name,
    title: input.title,
    body: input.body,
    createdAt: input.createdAt,
    critiques: [],
  };
  room.submissions.push(submission);
  return { ok: true, submission, room };
}

function parseStoredRoom(raw: unknown): Room | null {
  if (raw == null) return null;
  try {
    const room = typeof raw === "string" ? (JSON.parse(raw) as Room) : (raw as Room);
    if (!room || typeof room.code !== "string" || !Array.isArray(room.members) || !Array.isArray(room.submissions)) {
      return null;
    }
    return cloneRoom(room);
  } catch {
    return null;
  }
}

function rawString(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}

function withLock<T>(locks: Map<string, Promise<unknown>>, code: string, fn: () => T | Promise<T>): Promise<T> {
  const previous = locks.get(code) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  locks.set(
    code,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

function memoryStore(): ClubStore {
  const map = new Map<string, Room>();
  const locks = new Map<string, Promise<unknown>>();

  return {
    async get(code) {
      const room = map.get(code);
      return room ? cloneRoom(room) : null;
    },
    async createIfAbsent(room) {
      return withLock(locks, room.code, () => {
        if (map.has(room.code)) return { ok: false, error: "conflict" } as const;
        const stored = cloneRoom(room);
        map.set(room.code, stored);
        return { ok: true, room: cloneRoom(stored) };
      });
    },
    async joinMember(input) {
      return withLock(locks, input.code, () => {
        const current = map.get(input.code);
        if (!current) return { ok: false, error: "not_found" } as const;
        const result = applyJoin(cloneRoom(current), input);
        if (result.ok) map.set(input.code, cloneRoom(result.room));
        return result.ok ? { ok: true, member: structuredClone(result.member), room: cloneRoom(result.room) } : result;
      });
    },
    async appendSubmission(input) {
      return withLock(locks, input.code, () => {
        const current = map.get(input.code);
        if (!current) return { ok: false, error: "not_found" } as const;
        const result = applyAppend(cloneRoom(current), input);
        if (result.ok) map.set(input.code, cloneRoom(result.room));
        return result.ok ? { ok: true, submission: structuredClone(result.submission), room: cloneRoom(result.room) } : result;
      });
    },
    async deleteIfOwner(code, ownerToken) {
      return withLock(locks, code, () => {
        const current = map.get(code);
        if (!current) return { ok: false, error: "not_found" } as const;
        if (current.ownerToken !== ownerToken) return { ok: false, error: "forbidden" } as const;
        map.delete(code);
        return { ok: true, deleted: true } as const;
      });
    },
  };
}

function redisScripts(redis: Redis) {
  return {
    loadRaw: redis.createScript<unknown>(`return redis.call('GET', KEYS[1])`),
    casSet: redis.createScript<number>(`
      if redis.call('GET', KEYS[1]) ~= ARGV[1] then
        return 0
      end
      redis.call('SET', KEYS[1], ARGV[2])
      return 1
    `),
    casDel: redis.createScript<number>(`
      if redis.call('GET', KEYS[1]) ~= ARGV[1] then
        return 0
      end
      redis.call('DEL', KEYS[1])
      return 1
    `),
  };
}

function redisStore(redis: Redis, keyPrefix: string): ClubStore {
  const scripts = redisScripts(redis);
  const key = (code: string) => roomKey(code, keyPrefix);

  async function load(code: string): Promise<{ raw: string; room: Room } | { raw: null; room: null } | "unavailable"> {
    try {
      const raw = rawString(await scripts.loadRaw.exec([key(code)], []));
      if (raw == null) return { raw: null, room: null };
      const room = parseStoredRoom(raw);
      if (!room) return "unavailable";
      return { raw, room };
    } catch {
      return "unavailable";
    }
  }

  return {
    async get(code) {
      try {
        const loaded = await load(code);
        if (loaded === "unavailable") return null;
        return loaded.room ? cloneRoom(loaded.room) : null;
      } catch {
        return null;
      }
    },
    async createIfAbsent(room) {
      try {
        const wrote = await redis.set(key(room.code), JSON.stringify(room), { nx: true });
        if (wrote === "OK") return { ok: true, room: cloneRoom(room) };
        return { ok: false, error: "conflict" };
      } catch {
        return { ok: false, error: "unavailable" };
      }
    },
    async joinMember(input) {
      for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
        const loaded = await load(input.code);
        if (loaded === "unavailable") return { ok: false, error: "unavailable" };
        if (!loaded.room) return { ok: false, error: "not_found" };
        const result = applyJoin(cloneRoom(loaded.room), input);
        if (!result.ok) return result;
        try {
          const swapped = await scripts.casSet.exec([key(input.code)], [loaded.raw, JSON.stringify(result.room)]);
          if (swapped === 1) {
            return { ok: true, member: structuredClone(result.member), room: cloneRoom(result.room) };
          }
        } catch {
          return { ok: false, error: "unavailable" };
        }
      }
      return { ok: false, error: "conflict" };
    },
    async appendSubmission(input) {
      for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
        const loaded = await load(input.code);
        if (loaded === "unavailable") return { ok: false, error: "unavailable" };
        if (!loaded.room) return { ok: false, error: "not_found" };
        const result = applyAppend(cloneRoom(loaded.room), input);
        if (!result.ok) return result;
        try {
          const swapped = await scripts.casSet.exec([key(input.code)], [loaded.raw, JSON.stringify(result.room)]);
          if (swapped === 1) {
            return { ok: true, submission: structuredClone(result.submission), room: cloneRoom(result.room) };
          }
        } catch {
          return { ok: false, error: "unavailable" };
        }
      }
      return { ok: false, error: "conflict" };
    },
    async deleteIfOwner(code, ownerToken) {
      for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
        const loaded = await load(code);
        if (loaded === "unavailable") return { ok: false, error: "unavailable" };
        if (!loaded.room) return { ok: false, error: "not_found" };
        if (loaded.room.ownerToken !== ownerToken) return { ok: false, error: "forbidden" };
        try {
          const swapped = await scripts.casDel.exec([key(code)], [loaded.raw]);
          if (swapped === 1) return { ok: true, deleted: true };
        } catch {
          return { ok: false, error: "unavailable" };
        }
      }
      return { ok: false, error: "conflict" };
    },
  };
}

export function createClubStore(options: ClubStoreOptions = {}): ClubStore {
  if (options.redis) return redisStore(options.redis, options.keyPrefix ?? DEFAULT_KEY_PREFIX);
  return memoryStore();
}

let store: ClubStore | null = null;

function configuredRedis(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function getStore(): ClubStore {
  if (store) return store;
  const redis = configuredRedis();
  if (redis) {
    store = createClubStore({
      redis: new Redis({
        url: redis.url,
        token: redis.token,
        automaticDeserialization: false,
      }),
    });
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("[club] No Upstash Redis configured — rooms are in-memory and will not persist.");
    }
    store = createClubStore();
  }
  return store;
}

/** Test-only: swap the process singleton. Pass null to drop it. */
export function replaceStoreForTests(next: ClubStore | null): void {
  store = next;
}

/**
 * Whether the room store is usable. Local dev runs in-memory (fine for one
 * process); production requires a real Redis so rooms persist across instances.
 */
export function isStoreConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return configuredRedis() !== null;
}

/** Short, unambiguous room code (no vowels/lookalikes) — e.g. "k7r-2qx". */
export function newRoomCode(): string {
  const alphabet = "23456789bcdfghjkmnpqrstvwxz";
  const pick = (n: number) =>
    Array.from(randomBytes(n))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${pick(3)}-${pick(3)}`;
}

export function newToken(): string {
  return randomBytes(18).toString("base64url");
}

export function newId(): string {
  return randomBytes(9).toString("base64url");
}
