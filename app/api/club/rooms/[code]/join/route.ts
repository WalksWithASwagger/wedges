import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, newId, newToken, storeErrorMessage, storeStatus } from "@/lib/club/store";
import { memberCookie, cookieOpts } from "@/lib/club/cookies";
import type { Member } from "@/lib/club/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const name = (typeof body?.name === "string" ? body.name : "").trim().slice(0, 40);
  const profileMarkdown = (typeof body?.profileMarkdown === "string" ? body.profileMarkdown : "").slice(0, 20000);
  if (!name) return NextResponse.json({ error: "invalid_input", message: "A display name is required." }, { status: 400 });

  const c = await cookies();
  const candidate: Member = { id: newId(), name, token: newToken(), profileMarkdown, joinedAt: Date.now() };
  const result = await getStore().joinMember({
    code,
    memberToken: c.get(memberCookie(code))?.value,
    name,
    profileMarkdown,
    candidate,
  });
  if (!result.ok) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: result.error, message: storeErrorMessage(result.error) },
      { status: storeStatus(result.error) },
    );
  }

  c.set(memberCookie(code), result.member.token, cookieOpts);
  return NextResponse.json({ memberId: result.member.id, name: result.member.name, hasProfile: result.member.profileMarkdown.length > 0 });
}
