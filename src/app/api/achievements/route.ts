import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/achievements — all achievements + which the current user has earned
export async function GET() {
  const user = await getCurrentUser();
  const achievements = await db.achievement.findMany({
    orderBy: [{ category: "asc" }, { xpReward: "asc" }],
  });

  let earned: { achievementId: string; receivedAt: Date }[] = [];
  if (user) {
    earned = await db.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievementId: true, receivedAt: true },
    });
  }
  const earnedMap = new Map(earned.map((e) => [e.achievementId, e.receivedAt]));

  return NextResponse.json(
    achievements.map((a) => ({
      ...a,
      earned: earnedMap.has(a.id),
      earnedAt: earnedMap.get(a.id) || null,
    }))
  );
}
