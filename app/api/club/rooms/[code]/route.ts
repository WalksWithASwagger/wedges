import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore } from "@/lib/club/store";
import { ownerCookie } from "@/lib/club/cookies";
import { toPublicRoom } from "@/lib/club/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getStore().get(code);
  if (!room) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(toPublicRoom(room));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const store = getStore();
  const room = await store.get(code);
  if (!room) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const token = (await cookies()).get(ownerCookie(code))?.value;
  if (token !== room.ownerToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await store.del(code);
  return NextResponse.json({ ok: true });
}
