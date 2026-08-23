import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/activity — user's activity over the last 365 days (for heatmap)
// Counts: lessons completed, dialogs finished, flashcard reviews (SRS), dialog sessions
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  oneYearAgo.setHours(0, 0, 0, 0);

  const [lessonProgress, dialogSessions, srsReviews] = await Promise.all([
    db.lessonProgress.findMany({
      where: { userId: user.id, createdAt: { gte: oneYearAgo } },
      select: { createdAt: true, isCompleted: true, score: true },
    }),
    db.dialogSession.findMany({
      where: { userId: user.id, startedAt: { gte: oneYearAgo } },
      select: { startedAt: true, status: true },
    }),
    db.srsReview.findMany({
      where: { userId: user.id, lastReviewedAt: { gte: oneYearAgo } },
      select: { lastReviewedAt: true },
    }),
  ]);

  // Build day-keyed activity map (yyyy-mm-dd → count + details)
  const dayMap: Record<string, { lessons: number; dialogs: number; reviews: number; xp: number }> = {};

  // Initialize last 365 days
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dayMap[d.toISOString().slice(0, 10)] = { lessons: 0, dialogs: 0, reviews: 0, xp: 0 };
  }

  // Lessons
  for (const lp of lessonProgress) {
    const key = lp.createdAt.toISOString().slice(0, 10);
    if (dayMap[key]) {
      dayMap[key].lessons += 1;
      if (lp.isCompleted) {
        dayMap[key].xp += Math.round(lp.score / 10) * 5 + 20;
      } else {
        dayMap[key].xp += Math.round(lp.score / 10) * 2;
      }
    }
  }

  // Dialogs
  for (const ds of dialogSessions) {
    const key = ds.startedAt.toISOString().slice(0, 10);
    if (dayMap[key]) {
      dayMap[key].dialogs += 1;
      if (ds.status === "finished") {
        dayMap[key].xp += 30;
      }
    }
  }

  // SRS reviews
  for (const r of srsReviews) {
    if (!r.lastReviewedAt) continue;
    const key = r.lastReviewedAt.toISOString().slice(0, 10);
    if (dayMap[key]) {
      dayMap[key].reviews += 1;
      dayMap[key].xp += 2; // avg +2 XP per review
    }
  }

  // Convert to array sorted by date asc
  const days = Object.entries(dayMap)
    .map(([date, stats]) => ({
      date,
      ...stats,
      total: stats.lessons + stats.dialogs + stats.reviews,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute current streak
  let currentStreak = 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = dayMap[key];
    if (!day) break;
    const total = day.lessons + day.dialogs + day.reviews;
    if (total === 0) {
      // Today is allowed to have 0 (don't break streak if today is empty)
      if (i === 0) continue;
      break;
    }
    currentStreak += 1;
  }

  // Longest streak (within last 365 days)
  let longestStreak = 0;
  let running = 0;
  for (const day of days) {
    if (day.total > 0) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  // Total stats
  const totalActivity = days.reduce((s, d) => ({
    lessons: s.lessons + d.lessons,
    dialogs: s.dialogs + d.dialogs,
    reviews: s.reviews + d.reviews,
    xp: s.xp + d.xp,
  }), { lessons: 0, dialogs: 0, reviews: 0, xp: 0 });

  // Active days (days with any activity)
  const activeDays = days.filter((d) => d.total > 0).length;

  return NextResponse.json({
    days,
    stats: {
      currentStreak,
      longestStreak,
      activeDays,
      totalDays: 365,
      ...totalActivity,
    },
  });
}
