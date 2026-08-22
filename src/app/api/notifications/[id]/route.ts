import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/notifications/[id] — mark as read (or unread if body.isRead=false)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  let body: any = {};
  try { body = await req.json(); } catch {}
  const isRead = body.isRead !== false;

  const notif = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!notif) return NextResponse.json({ error: "Уведомление не найдено" }, { status: 404 });

  const updated = await db.notification.update({
    where: { id },
    data: { isRead },
  });
  return NextResponse.json({ notification: updated });
}

// DELETE /api/notifications/[id] — delete a notification
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { id } = await params;
  const notif = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!notif) return NextResponse.json({ error: "Уведомление не найдено" }, { status: 404 });

  await db.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
