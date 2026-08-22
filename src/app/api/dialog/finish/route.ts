import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const FinishSchema = z.object({
  sessionId: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
});

// POST /api/dialog/finish — close a dialog session + award XP/achievement
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = FinishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const { sessionId, rating } = parsed.data;

  const session = await db.dialogSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }
  if (session.status === "finished") {
    return NextResponse.json({ ok: true, alreadyFinished: true });
  }

  const messages = JSON.parse(session.messagesJson) as { role: string }[];
  const userTurns = messages.filter((m) => m.role === "user").length;
  const overall = rating ? rating * 20 : Math.min(100, 50 + userTurns * 10);

  await db.dialogSession.update({
    where: { id: sessionId },
    data: {
      status: "finished",
      finishedAt: new Date(),
      scoreJson: JSON.stringify({ overall, userTurns, rating }),
    },
  });

  // Award XP + achievements
  const xpGained = 30 + Math.round(overall / 5);
  await db.studentProfile.update({
    where: { userId: user.id },
    data: {
      xp: { increment: xpGained },
      lastActivityAt: new Date(),
    },
  });

  const newAchievements: string[] = [];
  const dialogCount = await db.dialogSession.count({
    where: { userId: user.id, status: "finished" },
  });
  if (dialogCount >= 1) await awardAchievement(user.id, "dialog_first", newAchievements);
  if (dialogCount >= 10) await awardAchievement(user.id, "dialog_10", newAchievements);

  return NextResponse.json({
    ok: true,
    score: { overall, userTurns, rating },
    xpGained,
    newAchievements,
  });
}

async function awardAchievement(userId: string, code: string, newAchievements: string[]) {
  const achievement = await db.achievement.findUnique({ where: { code } });
  if (!achievement) return;
  const existing = await db.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing) return;
  await db.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });
  if (achievement.xpReward > 0) {
    await db.studentProfile.update({
      where: { userId },
      data: { xp: { increment: achievement.xpReward } },
    });
  }
  newAchievements.push(achievement.title);
}
