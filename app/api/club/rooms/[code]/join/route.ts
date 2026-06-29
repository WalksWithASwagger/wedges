import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, newId, newToken } from "@/lib/club/store";
import { memberCookie, cookieOpts } from "@/lib/club/cookies";
import type { Member } from "@/lib/club/types";

export const runtime = "nodejs";

const MAX_MEMBERS = 12;

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const name = (typeof body?.name === "string" ? body.name : "").trim().slice(0, 40);
  const profileMarkdown = (typeof body?.profileMarkdown === "string" ? body.profileMarkdown : "").slice(0, 20000);
  if (!name) return NextResponse.json({ error: "invalid_input", message: "A display name is required." }, { status: 400 });

  const store = getStore();
  const room = await store.get(code);
  if (!room) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const c = await cookies();
  const existing = room.members.find((m) => m.token === c.get(memberCookie(code))?.value);

  let member: Member;
  if (existing) {
    existing.name = name;
    if (profileMarkdown) existing.profileMarkdown = profileMarkdown;
    member = existing;
  } else {
    if (room.members.length >= MAX_MEMBERS) {
      return NextResponse.json({ error: "room_full", message: "This room is full." }, { status: 409 });
    }
    member = { id: newId(), name, token: newToken(), profileMarkdown, joinedAt: Date.now() };
    room.members.push(member);
  }

  await store.set(room);
  c.set(memberCookie(code), member.token, cookieOpts);
  return NextResponse.json({ memberId: member.id, name: member.name, hasProfile: member.profileMarkdown.length > 0 });
}
