import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/srs/stats — overall SRS statistics for the user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    dueToday,
    newCards,
    learning,
    learned,
    totalTracked,
    totalCards,
    reviewsToday,
    reviewsThisWeek,
  ] = await Promise.all([
    db.srsReview.count({ where: { userId: user.id, nextReviewAt: { lte: now } } }),
    db.srsReview.count({ where: { userId: user.id, repetitions: 0 } }),
    db.srsReview.count({ where: { userId: user.id, interval: { gte: 1, lt: 21 } } }),
    db.srsReview.count({ where: { userId: user.id, interval: { gte: 21 } } }),
    db.srsReview.count({ where: { userId: user.id } }),
    db.vocabulary.count({ where: { deletedAt: null } }),
    db.srsReview.count({
      where: {
        userId: user.id,
        lastReviewedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    }),
    db.srsReview.count({
      where: {
        userId: user.id,
        lastReviewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Accuracy rate
  const allReviews = await db.srsReview.findMany({
    where: { userId: user.id, totalReviews: { gt: 0 } },
    select: { totalReviews: true, correctReviews: true },
  });
  const totalReviewsSum = allReviews.reduce((s, r) => s + r.totalReviews, 0);
  const correctReviewsSum = allReviews.reduce((s, r) => s + r.correctReviews, 0);
  const accuracy = totalReviewsSum > 0 ? Math.round((correctReviewsSum / totalReviewsSum) * 100) : 0;

  // Per-day reviews over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentReviews = await db.srsReview.findMany({
    where: { userId: user.id, lastReviewedAt: { gte: thirtyDaysAgo } },
    select: { lastReviewedAt: true, correctReviews: true, totalReviews: true },
  });

  // Build per-day chart
  const dayMap: Record<string, { total: number; correct: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dayMap[d.toISOString().slice(0, 10)] = { total: 0, correct: 0 };
  }
  // We can't compute per-day from cumulative stats easily, so we just count cards reviewed on that day
  // (this is approximate — counts a card once per day if lastReviewedAt is that day)
  for (const r of recentReviews) {
    if (!r.lastReviewedAt) continue;
    const dayKey = r.lastReviewedAt.toISOString().slice(0, 10);
    if (dayMap[dayKey]) {
      dayMap[dayKey].total += 1;
    }
  }
  const activityChart = Object.entries(dayMap).map(([date, stats]) => ({
    date,
    count: stats.total,
  }));

  return NextResponse.json({
    stats: {
      dueToday,
      newCards,
      learning,
      learned,
      totalTracked,
      totalCards,
      reviewsToday,
      reviewsThisWeek,
      accuracy,
      masteryRate: totalCards > 0 ? Math.round((learned / totalCards) * 100) : 0,
    },
    activityChart,
  });
}
