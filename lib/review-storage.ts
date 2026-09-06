import { z } from "zod";
import { ReviewRecordSchema } from "./review-record";

// Local editing may temporarily exceed export limits; the portable contract stays strict.
const EditingRecordSchema = ReviewRecordSchema.safeExtend({
  revisedWork: z.string(),
  decisions: z.array(z.object({ status: z.enum(["pending", "accept", "reject", "modify"]), reason: z.string() }).strict()).max(3),
});
export const LocalDraftSchema = z.object({
  title: z.string().max(120),
  sources: z.object({ profileMarkdown: z.string(), work: z.string(), question: z.string().optional() }).strict(),
  record: EditingRecordSchema.nullable(),
  imported: z.boolean(),
}).strict();
export type LocalDraft = z.infer<typeof LocalDraftSchema>;
const ItemSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), revision: z.number().int().positive(),
  updatedAt: z.string().datetime(), predecessorId: z.string().uuid().nullable(), draft: LocalDraftSchema,
}).strict();
export type LocalItem = z.infer<typeof ItemSchema>;
export type LocalIdentity = Pick<LocalItem, "id" | "revision" | "predecessorId">;
export const emptyDraft = (): LocalDraft => ({ title: "", sources: { profileMarkdown: "", work: "", question: "" }, record: null, imported: false });
export class ReviewConflict extends Error {}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("wedges-reviews", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("items", { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Storage is blocked"));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function listReviews(): Promise<{ items: LocalItem[]; unreadable: number }> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("items", "readonly").objectStore("items").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result.map((value: unknown) => ItemSchema.safeParse(value));
        resolve({ items: results.flatMap((result) => result.success ? [result.data] : []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), unreadable: results.filter((result) => !result.success).length });
      };
    });
  } finally { db.close(); }
}

async function mutate(identity: LocalIdentity, draft: LocalDraft | null): Promise<LocalItem | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("items", "readwrite");
      const store = transaction.objectStore("items");
      let result: LocalItem | null = null;
      let conflict = false;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(conflict ? new ReviewConflict("A newer local version exists") : transaction.error ?? new Error("Local write failed"));
      const request = store.get(identity.id);
      request.onsuccess = () => {
        const existing = ItemSchema.safeParse(request.result);
        if ((request.result !== undefined && (!existing.success || existing.data.revision !== identity.revision)) || (request.result === undefined && identity.revision !== 0)) {
          conflict = true;
          transaction.abort();
          return;
        }
        try {
          if (draft) {
            result = ItemSchema.parse({ ...identity, version: 1, revision: identity.revision + 1, updatedAt: new Date().toISOString(), draft });
            store.put(result);
          } else { store.delete(identity.id); }
        } catch { transaction.abort(); }
      };
    });
  } finally { db.close(); }
}

export async function saveReview(identity: LocalIdentity, draft: LocalDraft): Promise<LocalItem> {
  LocalDraftSchema.parse(draft);
  return (await mutate(identity, draft))!;
}
export async function deleteReview(identity: LocalIdentity): Promise<void> { await mutate(identity, null); }
