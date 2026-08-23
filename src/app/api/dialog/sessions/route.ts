import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/dialog/sessions — list user's past dialog sessions
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const sessions = await db.dialogSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    include: {
      scenario: {
        select: { id: true, title: true, level: true, icon: true },
      },
    },
    take: 50,
  });

  const items = sessions.map((s) => {
    const messages = JSON.parse(s.messagesJson) as any[];
    const userMessages = messages.filter((m) => m.role === "user").length;
    let score: any = {};
    try { score = JSON.parse(s.scoreJson || "{}"); } catch {}
    return {
      id: s.id,
      scenario: s.scenario,
      status: s.status,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      messageCount: messages.length,
      userTurns: userMessages,
      score,
      preview: messages[0]?.content?.slice(0, 100) || "(пустой диалог)",
      messages, // full message history for replay
    };
  });

  return NextResponse.json({
    items,
    total: items.length,
  });
}
