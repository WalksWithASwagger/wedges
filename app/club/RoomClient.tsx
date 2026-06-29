"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicRoom, Submission } from "@/lib/club/types";

type Joined = { memberId: string; name: string };

const SHIP_LABEL: Record<string, string> = { ship: "would ship", hold: "hold", cut: "cut it" };

export function RoomClient({ code }: { code: string }) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [missing, setMissing] = useState(false);
  const [joined, setJoined] = useState<Joined | null>(null);
  const [copied, setCopied] = useState(false);
  // Server and first client render must match — start with the path, fill the
  // absolute URL in after mount to avoid a hydration mismatch.
  const [shareUrl, setShareUrl] = useState(`/club/${code}`);

  const lsKey = `club_${code}`;

  useEffect(() => {
    setShareUrl(`${window.location.origin}/club/${code}`);
  }, [code]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/club/rooms/${code}`, { cache: "no-store" });
    if (res.status === 404) {
      setMissing(true);
      return;
    }
    if (res.ok) setRoom(await res.json());
  }, [code]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) setJoined(JSON.parse(raw));
    } catch {}
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [lsKey, load]);

  if (missing) {
    return (
      <Shell>
        <p className="kicker text-blood">Room not found</p>
        <h1 className="stencil text-paper text-4xl mt-3">This room is gone.</h1>
        <p className="mt-4 text-paper/70">It was deleted, or the code is wrong.</p>
        <a href="/club" className="mt-6 inline-block kicker border-2 border-paper/30 px-4 py-2 text-paper hover:border-blood">
          ← Start a new room
        </a>
      </Shell>
    );
  }

  const iAmMember = joined && room?.members.some((m) => m.id === joined.memberId);

  return (
    <Shell>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-paper/15 pb-5">
        <div>
          <p className="kicker text-blood">Film Club · {code}</p>
          <h1 className="stencil text-paper text-3xl mt-2">{room?.title ?? "…"}</h1>
        </div>
        <div className="flex items-stretch gap-2">
          <code className="border-l-2 border-blood bg-black/30 px-3 py-2 text-sm text-paper/80 max-w-[18rem] truncate">{shareUrl}</code>
          <button
            type="button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
            }}
            className={`kicker border-2 px-3 ${copied ? "border-blood bg-blood text-paper" : "border-paper/30 text-paper/70 hover:border-blood"}`}
          >
            {copied ? "copied ✓" : "copy link"}
          </button>
        </div>
      </div>

      {/* members */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(room?.members ?? []).map((m) => (
          <span key={m.id} className="border border-paper/20 px-3 py-1 text-sm text-paper/80">
            {m.name}
            {!m.hasProfile && <span className="text-paper/40"> · no profile</span>}
          </span>
        ))}
        {room?.members.length === 0 && <span className="text-paper/45 text-sm">No one&rsquo;s joined yet — you first.</span>}
      </div>

      {/* join or compose */}
      {iAmMember ? (
        <Composer code={code} onPosted={load} />
      ) : (
        <JoinPanel code={code} onJoined={(j) => { setJoined(j); localStorage.setItem(lsKey, JSON.stringify(j)); load(); }} />
      )}

      {/* submissions */}
      <div className="mt-12 space-y-8">
        {[...(room?.submissions ?? [])].reverse().map((s) => (
          <SubmissionCard key={s.id} s={s} />
        ))}
      </div>

      <div className="mt-16 border-t-2 border-paper/15 pt-5 flex items-center justify-between">
        <a href="/club" className="kicker text-paper/45 hover:text-blood">← Film Club</a>
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Delete this room for everyone? This can't be undone.")) return;
            const res = await fetch(`/api/club/rooms/${code}`, { method: "DELETE" });
            if (res.ok) { localStorage.removeItem(lsKey); setMissing(true); }
            else alert("Only the person who created the room can delete it.");
          }}
          className="kicker text-paper/35 hover:text-blood"
        >
          delete room
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-8">{children}</main>;
}

function JoinPanel({ code, onJoined }: { code: string; onJoined: (j: Joined) => void }) {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="mt-8 border-2 border-paper/20 bg-black/20 p-5 md:p-6">
      <p className="kicker text-paper/55 mb-4">Join the room</p>
      <label className="block mb-4">
        <span className="text-sm text-paper/60">Display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="what should the room call you"
          className="mt-1 w-full bg-paper/5 border-2 border-paper/20 focus:border-blood text-paper p-2 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm text-paper/60">Your taste profile</span>
        <span className="block text-xs text-paper/40 mb-1">Paste your taste-profile.md from Wedges — it&rsquo;s the lens the room reads others&rsquo; work through.</span>
        <textarea
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          rows={6}
          placeholder="# Taste Profile — you …"
          className="w-full bg-paper/5 border-2 border-paper/20 focus:border-blood text-paper p-3 outline-none font-typewriter text-sm resize-y"
        />
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={() => fileRef.current?.click()} className="kicker text-paper/55 hover:text-blood">
          ↑ upload .md instead
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setProfile(await f.text());
          }}
        />
      </div>

      {err && <p className="mt-3 text-sm text-blood">{err}</p>}
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={async () => {
          setBusy(true); setErr("");
          const res = await fetch(`/api/club/rooms/${code}/join`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, profileMarkdown: profile }),
          });
          const data = await res.json();
          if (res.ok) onJoined({ memberId: data.memberId, name: data.name });
          else { setErr(data.message || "Couldn't join."); setBusy(false); }
        }}
        className="mt-5 kicker border-2 border-blood bg-blood px-5 py-2.5 text-paper hover:bg-ink disabled:opacity-50"
      >
        {busy ? "joining…" : "Join"}
      </button>
      {!profile.trim() && (
        <p className="mt-3 text-xs text-paper/40">
          No profile? You can still join and watch — but you won&rsquo;t be able to critique others, and they&rsquo;ll have nothing to read your work through.
        </p>
      )}
    </section>
  );
}

function Composer({ code, onPosted }: { code: string; onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <section className="mt-8 border-2 border-blood/60 bg-black/20 p-5 md:p-6">
      <p className="kicker text-blood mb-4">Drop a piece</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="title (optional)"
        className="w-full bg-paper/5 border-2 border-paper/20 focus:border-blood text-paper p-2 outline-none mb-3"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        placeholder="Paste the thing you're working on. A paragraph, a scene, a pitch. The rougher the better."
        className="w-full bg-paper/5 border-2 border-paper/20 focus:border-blood text-paper p-3 outline-none font-typewriter text-sm resize-y"
      />
      {err && <p className="mt-3 text-sm text-blood">{err}</p>}
      <button
        type="button"
        disabled={busy || !body.trim()}
        onClick={async () => {
          setBusy(true); setErr("");
          const res = await fetch(`/api/club/rooms/${code}/submit`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title, body }),
          });
          const data = await res.json();
          if (res.ok) { setTitle(""); setBody(""); onPosted(); }
          else setErr(data.message || "Couldn't post.");
          setBusy(false);
        }}
        className="mt-4 kicker border-2 border-blood bg-blood px-5 py-2.5 text-paper hover:bg-ink disabled:opacity-50"
      >
        {busy ? "getting read…" : "Drop it ◣"}
      </button>
      <p className="mt-3 text-xs text-paper/40">Every other member with a profile will read it through their taste. Takes a few seconds.</p>
    </section>
  );
}

function SubmissionCard({ s }: { s: Submission }) {
  return (
    <article className="border-2 border-paper/15">
      <div className="border-b-2 border-paper/15 bg-black/20 p-4">
        <p className="kicker text-paper/50">{s.authorName} dropped</p>
        {s.title && <h3 className="stencil text-paper text-xl mt-1">{s.title}</h3>}
        <p className="mt-2 whitespace-pre-wrap text-paper/80 text-sm leading-relaxed">{s.body}</p>
      </div>
      <div className="divide-y-2 divide-paper/10">
        {s.critiques.length === 0 && (
          <p className="p-4 text-sm text-paper/45">No critiques yet — no other members had a profile to read it through.</p>
        )}
        {s.critiques.map((cr, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="kicker text-blood">{cr.fromName}</p>
              <span
                className={`kicker px-2 py-0.5 border-2 ${
                  cr.wouldShip === "cut"
                    ? "border-blood text-blood"
                    : cr.wouldShip === "ship"
                    ? "border-paper/40 bg-paper text-ink"
                    : "border-paper/25 text-paper/55"
                }`}
              >
                {SHIP_LABEL[cr.wouldShip] ?? cr.wouldShip}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-paper/85 leading-relaxed">{cr.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
