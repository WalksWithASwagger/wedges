import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore, storeErrorMessage, storeStatus } from "@/lib/club/store";
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
  const token = (await cookies()).get(ownerCookie(code))?.value ?? "";
  const result = await getStore().deleteIfOwner(code, token);
  if (!result.ok) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: result.error, message: storeErrorMessage(result.error) },
      { status: storeStatus(result.error) },
    );
  }
  return NextResponse.json({ ok: true });
}
