import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, newId, storeErrorMessage, storeStatus } from "@/lib/club/store";
import { memberCookie } from "@/lib/club/cookies";
import { checkRateLimit } from "@/lib/rate-limit";

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
  const memberToken = (await cookies()).get(memberCookie(code))?.value ?? "";
  const existing = await store.get(code);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!existing.members.some((member) => member.token === memberToken)) {
    return NextResponse.json({ error: "forbidden", message: "Join the room before dropping work." }, { status: 403 });
  }

  const limit = checkRateLimit("club_submit", { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? undefined });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: `Slow down — retry in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const result = await store.appendSubmission({
    code,
    memberToken,
    id: newId(),
    title,
    body: work,
    createdAt: Date.now(),
  });
  if (!result.ok) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "forbidden", message: "Join the room before dropping work." }, { status: 403 });
    }
    return NextResponse.json(
      { error: result.error, message: storeErrorMessage(result.error) },
      { status: storeStatus(result.error) },
    );
  }

  return NextResponse.json(result.submission);
}
