import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CREATE_CODE_ATTEMPTS, getStore, isStoreConfigured, newRoomCode, newToken, storeErrorMessage } from "@/lib/club/store";
import { ownerCookie, cookieOpts } from "@/lib/club/cookies";
import type { Room } from "@/lib/club/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStoreConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Film Club isn't switched on yet — check back soon." },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const title = (typeof body?.title === "string" ? body.title : "").trim().slice(0, 80) || "Film Club";

  const store = getStore();
  for (let attempt = 0; attempt < CREATE_CODE_ATTEMPTS; attempt++) {
    const code = newRoomCode();
    const ownerToken = newToken();
    const room: Room = {
      code,
      title,
      createdAt: Date.now(),
      ownerToken,
      members: [],
      submissions: [],
    };
    const created = await store.createIfAbsent(room);
    if (created.ok) {
      (await cookies()).set(ownerCookie(code), ownerToken, cookieOpts);
      return NextResponse.json({ code });
    }
    if (created.error === "unavailable") {
      return NextResponse.json({ error: "unavailable", message: storeErrorMessage("unavailable") }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "conflict", message: storeErrorMessage("conflict") }, { status: 409 });
}
