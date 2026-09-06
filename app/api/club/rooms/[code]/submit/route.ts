import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, newId } from "@/lib/club/store";
import { memberCookie } from "@/lib/club/cookies";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Submission } from "@/lib/club/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const title = (typeof body?.title === "string" ? body.title : "").trim().slice(0, 120);
  const work = (typeof body?.body === "string" ? body.body : "").trim();
  if (work.length < 1) {
    return NextResponse.json({ error: "invalid_input", message: "Drop some work first." }, { status: 400 });
  }

  if (work.length > 8000) {
    return NextResponse.json({ error: "invalid_input", message: "Keep work to 8,000 characters or fewer. Your draft has not been posted." }, { status: 400 });
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
    body: work,
    createdAt: Date.now(),
    critiques: [],
  };

  // Re-read to reduce clobbering concurrent joins/submits, then append.
  const fresh = (await store.get(code)) ?? room;
  fresh.submissions.push(submission);
  await store.set(fresh);

  return NextResponse.json(submission);
}
