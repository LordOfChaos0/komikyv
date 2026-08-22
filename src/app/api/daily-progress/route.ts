import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/daily-progress — today's XP progress vs daily goal
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });

  // Parse settings for dailyGoalXp
  let settings: any = {};
  try { settings = JSON.parse(profile.settingsJson || "{}"); } catch { settings = {}; }
  const dailyGoal = typeof settings.dailyGoalXp === "number" ? settings.dailyGoalXp : 50;

  // Today's XP: from lessonProgress + dialogSessions + srsReviews
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayLessons, todayDialogs, todaySrs] = await Promise.all([
    db.lessonProgress.findMany({
      where: { userId: user.id, createdAt: { gte: todayStart, lte: todayEnd } },
      select: { score: true, isCompleted: true },
    }),
    db.dialogSession.findMany({
      where: { userId: user.id, startedAt: { gte: todayStart, lte: todayEnd }, status: "finished" },
      select: { scoreJson: true },
    }),
    db.srsReview.findMany({
      where: { userId: user.id, lastReviewedAt: { gte: todayStart, lte: todayEnd } },
      select: { totalReviews: true, correctReviews: true },
    }),
  ]);

  // Calculate XP earned today
  let xpToday = 0;
  // Lessons: completed = round(score/10)*5 + 20, incomplete = round(score/10)*2
  for (const lp of todayLessons) {
    if (lp.isCompleted) xpToday += Math.round(lp.score / 10) * 5 + 20;
    else xpToday += Math.round(lp.score / 10) * 2;
  }
  // Dialogs: +30 each
  xpToday += todayDialogs.length * 30;
  // SRS: +2 per review (approximate)
  for (const srs of todaySrs) {
    xpToday += 2; // each SrsReview represents at least one review
  }

  const goalPercent = Math.min(100, Math.round((xpToday / dailyGoal) * 100));
  const isGoalReached = xpToday >= dailyGoal;
  const remaining = Math.max(0, dailyGoal - xpToday);

  // Streak info
  const streak = profile.currentStreak;
  const longestStreak = profile.longestStreak;
  const lastActivityAt = profile.lastActivityAt;

  // Activity breakdown
  const breakdown = {
    lessons: todayLessons.length,
    dialogs: todayDialogs.length,
    srsReviews: todaySrs.length,
  };

  // Week goal: 7 days with at least 1 activity
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekActivity = await db.lessonProgress.count({
    where: { userId: user.id, createdAt: { gte: weekAgo } },
  });
  const dialogActivity = await db.dialogSession.count({
    where: { userId: user.id, startedAt: { gte: weekAgo } },
  });
  const srsActivity = await db.srsReview.count({
    where: { userId: user.id, lastReviewedAt: { gte: weekAgo } },
  });
  const weekTotal = weekActivity + dialogActivity + srsActivity;

  return NextResponse.json({
    dailyGoal,
    xpToday,
    goalPercent,
    isGoalReached,
    remaining,
    streak,
    longestStreak,
    lastActivityAt,
    breakdown,
    week: {
      total: weekTotal,
      lessons: weekActivity,
      dialogs: dialogActivity,
      srsReviews: srsActivity,
    },
  });
}
