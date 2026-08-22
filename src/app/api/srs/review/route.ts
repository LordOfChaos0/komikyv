import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applySm2 } from "@/lib/srs";

const ReviewSchema = z.object({
  vocabularyId: z.string(),
  quality: z.number().int().min(0).max(5),
});

// POST /api/srs/review — record a review for a vocabulary card
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await req.json();
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const { vocabularyId, quality } = parsed.data;

  // Verify vocabulary exists
  const vocab = await db.vocabulary.findFirst({ where: { id: vocabularyId, deletedAt: null } });
  if (!vocab) return NextResponse.json({ error: "Слово не найдено" }, { status: 404 });

  // Find or create SrsReview
  let review = await db.srsReview.findUnique({
    where: {
      userId_vocabularyId: { userId: user.id, vocabularyId },
    },
  });

  const currentState = review
    ? {
        interval: review.interval,
        easinessFactor: review.easinessFactor,
        repetitions: review.repetitions,
      }
    : {
        interval: 0,
        easinessFactor: 2.5,
        repetitions: 0,
      };

  // Apply SM-2
  const result = applySm2(currentState, quality);

  // Upsert
  const wasCorrect = quality >= 3;
  const updated = await db.srsReview.upsert({
    where: {
      userId_vocabularyId: { userId: user.id, vocabularyId },
    },
    update: {
      interval: result.state.interval,
      easinessFactor: result.state.easinessFactor,
      repetitions: result.state.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: new Date(),
      totalReviews: { increment: 1 },
      correctReviews: wasCorrect ? { increment: 1 } : undefined,
    },
    create: {
      userId: user.id,
      vocabularyId,
      interval: result.state.interval,
      easinessFactor: result.state.easinessFactor,
      repetitions: result.state.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: new Date(),
      totalReviews: 1,
      correctReviews: wasCorrect ? 1 : 0,
    },
  });

  // Award XP for review (small bonus, +1 XP per review, +3 if learned milestone reached)
  let xpGained = 1;
  if (wasCorrect) xpGained += 1; // +2 total for correct
  if (result.isLearned && review && review.interval < 21) {
    // Just became learned! Bonus XP
    xpGained += 10;
    // Notification: card learned
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "Слово изучено! 🎓",
        message: `Слово «${vocab.wordKomi}» (${vocab.translationRu}) теперь в долговременной памяти!`,
        icon: "GraduationCap",
        color: "chart-1",
        link: "vocabulary",
      },
    }).catch(() => null);
  }
  await db.studentProfile.update({
    where: { userId: user.id },
    data: {
      xp: { increment: xpGained },
      lastActivityAt: new Date(),
    },
  }).catch(() => null);

  return NextResponse.json({
    review: updated,
    isCorrect: wasCorrect,
    isLearned: result.isLearned,
    nextReviewAt: result.nextReviewAt,
    interval: result.state.interval,
    xpGained,
  });
}
