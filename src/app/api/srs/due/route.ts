import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/srs/due — list vocabulary cards due for review
// Query params: ?limit=20 (max 50)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const now = new Date();

  // First, find cards that are due (nextReviewAt <= now)
  const dueReviews = await db.srsReview.findMany({
    where: {
      userId: user.id,
      nextReviewAt: { lte: now },
    },
    orderBy: { nextReviewAt: "asc" },
    take: limit,
    include: {
      vocabulary: {
        select: {
          id: true,
          wordKomi: true,
          translationRu: true,
          transcription: true,
          exampleKomi: true,
          exampleRu: true,
          partOfSpeech: true,
          audioBase64: true,
          lesson: { select: { id: true, title: true, module: { select: { id: true, title: true, level: true } } } },
        },
      },
    },
  });

  // If we don't have enough due cards, supplement with new cards (no SrsReview yet)
  let newCards: any[] = [];
  const reviewedVocabIds = await db.srsReview.findMany({
    where: { userId: user.id },
    select: { vocabularyId: true },
  });
  const reviewedSet = new Set(reviewedVocabIds.map((r) => r.vocabularyId));

  if (dueReviews.length < limit) {
    const remaining = limit - dueReviews.length;
    newCards = await db.vocabulary.findMany({
      where: {
        deletedAt: null,
        id: { notIn: Array.from(reviewedSet) },
      },
      orderBy: { createdAt: "asc" },
      take: remaining,
      select: {
        id: true,
        wordKomi: true,
        translationRu: true,
        transcription: true,
        exampleKomi: true,
        exampleRu: true,
        partOfSpeech: true,
        audioBase64: true,
        lesson: { select: { id: true, title: true, module: { select: { id: true, title: true, level: true } } } },
      },
    });
  }

  // Combine into a unified card format
  const cards = [
    ...dueReviews.map((r) => ({
      type: "review" as const,
      srsReviewId: r.id,
      vocabulary: r.vocabulary,
      srsState: {
        interval: r.interval,
        easinessFactor: r.easinessFactor,
        repetitions: r.repetitions,
        totalReviews: r.totalReviews,
        correctReviews: r.correctReviews,
        lastReviewedAt: r.lastReviewedAt,
        nextReviewAt: r.nextReviewAt,
      },
    })),
    ...newCards.map((v) => ({
      type: "new" as const,
      srsReviewId: null,
      vocabulary: v,
      srsState: null,
    })),
  ];

  // Stats
  const dueCount = await db.srsReview.count({
    where: { userId: user.id, nextReviewAt: { lte: now } },
  });
  const newCount = await db.vocabulary.count({
    where: { deletedAt: null, id: { notIn: Array.from(reviewedSet) } },
  });
  const learnedCount = await db.srsReview.count({
    where: { userId: user.id, interval: { gte: 21 } },
  });
  const totalReviewsCount = await db.srsReview.count({
    where: { userId: user.id },
  });

  return NextResponse.json({
    cards,
    stats: {
      dueToday: dueCount,
      newAvailable: newCount,
      learned: learnedCount,
      totalTracked: totalReviewsCount,
      totalCards: await db.vocabulary.count({ where: { deletedAt: null } }),
    },
  });
}
