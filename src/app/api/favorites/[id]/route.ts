import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/favorites/[id] — remove a favorite
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  // The id might be either Favorite.id or vocabulary.id (for convenience)
  // Try by favorite id first, then by vocab id + user
  let favorite = await db.favorite.findFirst({
    where: { id, userId: user.id },
  });
  if (!favorite) {
    favorite = await db.favorite.findFirst({
      where: { vocabularyId: id, userId: user.id },
    });
  }
  if (!favorite) {
    return NextResponse.json({ error: "Закладка не найдена" }, { status: 404 });
  }

  await db.favorite.delete({ where: { id: favorite.id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/favorites/[id] — update note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const note: string | null = body.note ?? null;

  let favorite = await db.favorite.findFirst({ where: { id, userId: user.id } });
  if (!favorite) {
    return NextResponse.json({ error: "Закладка не найдена" }, { status: 404 });
  }
  const updated = await db.favorite.update({
    where: { id: favorite.id },
    data: { note },
  });
  return NextResponse.json({ favorite: updated });
}
