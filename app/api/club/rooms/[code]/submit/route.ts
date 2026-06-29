import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, newId } from "@/lib/club/store";
import { memberCookie } from "@/lib/club/cookies";
import { runCritique } from "@/lib/club/critique";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Critique, Submission } from "@/lib/club/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REVIEWERS = 8; // bound LLM cost per submission

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const title = (typeof body?.title === "string" ? body.title : "").trim().slice(0, 120);
  const work = (typeof body?.body === "string" ? body.body : "").trim();
  if (work.length < 1) {
    return NextResponse.json({ error: "invalid_input", message: "Drop some work first." }, { status: 400 });
  }

  const store = getStore();
  const room = await store.get(code);
  if (!room) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const c = await cookies();
  const author = room.members.find((m) => m.token === c.get(memberCookie(code))?.value);
  if (!author) {
    return NextResponse.json({ error: "forbidden", message: "Join the room before dropping work." }, { status: 403 });
  }

  const limit = checkRateLimit("club_submit", { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? undefined });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: `Slow down — retry in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const submission: Submission = {
    id: newId(),
    memberId: author.id,
    authorName: author.name,
    title,
    body: work.slice(0, 8000),
    createdAt: Date.now(),
    critiques: [],
  };

  const reviewers = room.members
    .filter((m) => m.id !== author.id && m.profileMarkdown.trim().length > 0)
    .slice(0, MAX_REVIEWERS);

  const critiques = (
    await Promise.all(
      reviewers.map(async (r): Promise<Critique | null> => {
        try {
          const cr = await runCritique({
            reviewerName: r.name,
            reviewerProfile: r.profileMarkdown,
            work: { title: submission.title, body: submission.body },
          });
          return { fromMemberId: r.id, fromName: r.name, text: cr.text, wouldShip: cr.wouldShip, createdAt: Date.now() };
        } catch {
          return null;
        }
      }),
    )
  ).filter((x): x is Critique => x !== null);

  submission.critiques = critiques;

  // Re-read to reduce clobbering concurrent joins/submits, then append.
  const fresh = (await store.get(code)) ?? room;
  fresh.submissions.push(submission);
  await store.set(fresh);

  return NextResponse.json(submission);
}
