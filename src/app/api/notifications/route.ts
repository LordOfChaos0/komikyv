import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/notifications — list user's notifications
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // all | unread
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "30", 10));

  const where: any = { userId: user.id };
  if (filter === "unread") where.isRead = false;

  const [items, unreadCount, totalCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
    db.notification.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    items,
    unreadCount,
    totalCount,
  });
}

// POST /api/notifications — create a notification (used internally by other routes)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await req.json();
  const { type, title, message, icon, color, link, linkParams } = body as {
    type?: string;
    title?: string;
    message?: string;
    icon?: string;
    color?: string;
    link?: string;
    linkParams?: string;
  };
  if (!type || !title || !message) {
    return NextResponse.json({ error: "type, title, message обязательны" }, { status: 400 });
  }
  const notification = await db.notification.create({
    data: {
      userId: user.id,
      type,
      title,
      message,
      icon: icon || "Bell",
      color: color || "primary",
      link: link || null,
      linkParams: linkParams || null,
    },
  });
  return NextResponse.json({ notification });
}
