"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartRoom() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setErr("");
          try {
            const res = await fetch("/api/club/rooms", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setErr(data.message || "Couldn't start a room.");
              setLoading(false);
              return;
            }
            router.push(`/club/${data.code}`);
          } catch {
            setErr("Couldn't start a room.");
            setLoading(false);
          }
        }}
        className="kicker border-2 border-blood bg-blood px-6 py-3 text-paper hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        {loading ? "starting…" : "Start a room ◣"}
      </button>
      {err && <p className="mt-3 text-sm text-blood">{err}</p>}
    </div>
  );
}
