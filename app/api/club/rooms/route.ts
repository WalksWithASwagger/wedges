import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, isStoreConfigured, newRoomCode, newToken } from "@/lib/club/store";
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
  let code = newRoomCode();
  for (let i = 0; i < 4 && (await store.get(code)); i++) code = newRoomCode();

  const ownerToken = newToken();
  const room: Room = {
    code,
    title,
    createdAt: Date.now(),
    ownerToken,
    members: [],
    submissions: [],
  };
  await store.set(room);

  (await cookies()).set(ownerCookie(code), ownerToken, cookieOpts);
  return NextResponse.json({ code });
}
