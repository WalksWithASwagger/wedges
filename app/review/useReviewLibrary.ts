"use client";

import { useEffect, useRef, useState } from "react";
import { deleteReview, emptyDraft, listReviews, ReviewConflict, saveReview, type LocalDraft, type LocalIdentity, type LocalItem } from "@/lib/review-storage";

export function useReviewLibrary() {
  const [draft, renderDraft] = useState<LocalDraft>(emptyDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<LocalItem[]>([]);
  const [status, setStatus] = useState<"loading" | "saved" | "saving" | "error" | "conflict">("loading");
  const [warning, setWarning] = useState("");
  const [opened, setOpened] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const current = useRef(draft);
  const identity = useRef<LocalIdentity | null>(null);
  const saved = useRef(JSON.stringify(draft));
  const ready = useRef(false);
  const failed = useRef(false);
  const running = useRef<Promise<boolean> | null>(null);

  function restore(item: LocalItem) {
    identity.current = item;
    setSelectedId(item.id);
    current.current = item.draft;
    saved.current = JSON.stringify(item.draft);
    renderDraft(item.draft);
    failed.current = false;
    setStatus("saved");
    setOpened((n) => n + 1);
  }

  useEffect(() => {
    let cancelled = false;
    listReviews().then(({ items: found, unreadable }) => {
      if (cancelled) return;
      setItems(found);
      if (unreadable) setWarning(`${unreadable} unreadable or newer-format local item(s) were left untouched. Export your current work as a backup.`);
      if (found[0]) restore(found[0]);
      else setStatus("saved");
      ready.current = true;
    }).catch(() => {
      if (cancelled) return;
      ready.current = true;
      failed.current = true;
      setStatus("error");
    });
    const warn = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(current.current) !== saved.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => { cancelled = true; window.removeEventListener("beforeunload", warn); };
  }, []);

  async function flush(): Promise<boolean> {
    if (running.current) return running.current;
    if (JSON.stringify(current.current) === saved.current) return true;
    if (failed.current || !ready.current) return false;
    setStatus("saving");
    running.current = (async () => {
      try {
        while (JSON.stringify(current.current) !== saved.current) {
          const snapshot = current.current;
          const serialized = JSON.stringify(snapshot);
          const key = identity.current ?? { id: crypto.randomUUID(), revision: 0, predecessorId: null };
          const item = await saveReview(key, snapshot);
          identity.current = item;
          setSelectedId(item.id);
          saved.current = serialized;
          setItems((previous) => [item, ...previous.filter((other) => other.id !== item.id)]);
        }
        setStatus("saved");
        return true;
      } catch (error) {
        failed.current = true;
        setStatus(error instanceof ReviewConflict ? "conflict" : "error");
        return false;
      } finally { running.current = null; }
    })();
    return running.current;
  }

  function setDraft(update: LocalDraft | ((previous: LocalDraft) => LocalDraft)) {
    current.current = typeof update === "function" ? update(current.current) : update;
    renderDraft(current.current);
    void flush();
  }

  // Intentional route changes wait for pending writes, including the page's header links.
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.origin !== window.location.origin || JSON.stringify(current.current) === saved.current) return;
      event.preventDefault();
      event.stopPropagation();
      void flush().then((ok) => { if (ok) window.location.assign(link.href); });
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  });

  async function canLeave() {
    if (await flush()) return true;
    return status === "error" && window.confirm("Local saving is unavailable. Continue and replace this tab's unsaved work? Export JSON or download draft text first. Unsaved work cannot be recovered after leaving this tab.");
  }

  async function create(next: LocalDraft, predecessor = false) {
    setTransitioning(true);
    try {
      if (!await canLeave()) return false;
      const predecessorId = predecessor ? identity.current?.id ?? null : null;
      identity.current = { id: crypto.randomUUID(), revision: 0, predecessorId };
      saved.current = "";
      setDraft(next);
      setOpened((n) => n + 1);
      return true;
    } finally { setTransitioning(false); }
  }

  async function open(id: string, discard = false) {
    setTransitioning(true);
    try {
      if (!discard && !await canLeave()) return;
      const { items: found, unreadable } = await listReviews();
      setItems(found);
      const item = found.find((entry) => entry.id === id);
      if (!item) {
        setWarning("This item is missing or unreadable. Your current work is still here; keep it as a copy.");
        return;
      }
      if (unreadable) setWarning("Unreadable local items were left untouched.");
      restore(item);
    } catch { setWarning("The local library could not be read. Your current work is still here."); }
    finally { setTransitioning(false); }
  }

  async function keepCopy() {
    if (running.current) await running.current;
    identity.current = { id: crypto.randomUUID(), revision: 0, predecessorId: identity.current?.id ?? null };
    saved.current = "";
    failed.current = false;
    await flush();
  }

  async function remove() {
    if (!identity.current || !window.confirm("Delete this local item from this browser? Portable exports and other items will stay untouched.")) return;
    setTransitioning(true);
    try {
      if (!await flush() || !identity.current) return;
      const deletedId = identity.current.id;
      await deleteReview(identity.current);
      setItems((previous) => previous.filter((item) => item.id !== deletedId));
      identity.current = null;
      setSelectedId(null);
      current.current = emptyDraft(); saved.current = JSON.stringify(current.current);
      renderDraft(current.current); setStatus("saved"); setOpened((n) => n + 1);
    } catch (error) {
      failed.current = true;
      setStatus(error instanceof ReviewConflict ? "conflict" : "error");
    } finally { setTransitioning(false); }
  }

  return { draft, setDraft, items, selectedId, status, warning, opened, busy: status === "loading" || transitioning,
    create, open, remove, keepCopy, flush,
    retry: async () => { failed.current = false; saved.current = ""; await flush(); },
    reload: async () => { if (identity.current && window.confirm("Reload the saved version? Unsaved edits in this tab will be discarded. Keep as copy to preserve them instead.")) await open(identity.current.id, true); },
  };
}
