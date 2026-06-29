import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { Room } from "@/lib/club/types";

/**
 * Room store. Uses Upstash Redis when configured (production); falls back to an
 * in-memory map for local dev so the full flow is testable without provisioning.
 * Rooms persist until deleted — no TTL.
 */
interface Store {
  get(code: string): Promise<Room | null>;
  set(room: Room): Promise<void>;
  del(code: string): Promise<void>;
}

const key = (code: string) => `room:${code}`;

function redisStore(redis: Redis): Store {
  return {
    async get(code) {
      return (await redis.get<Room>(key(code))) ?? null;
    },
    async set(room) {
      await redis.set(key(room.code), room);
    },
    async del(code) {
      await redis.del(key(code));
    },
  };
}

function memoryStore(): Store {
  const map = new Map<string, Room>();
  return {
    async get(code) {
      return map.get(code) ?? null;
    },
    async set(room) {
      map.set(room.code, room);
    },
    async del(code) {
      map.delete(code);
    },
  };
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    store = redisStore(new Redis({ url, token }));
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("[club] No Upstash Redis configured — rooms are in-memory and will not persist.");
    }
    store = memoryStore();
  }
  return store;
}

/**
 * Whether the room store is usable. Local dev runs in-memory (fine for one
 * process); production requires a real Redis so rooms persist across instances.
 */
export function isStoreConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
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
