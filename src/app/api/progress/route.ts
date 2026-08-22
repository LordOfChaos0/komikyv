import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const SubmitSchema = z.object({
  lessonId: z.string(),
  answers: z.array(
    z.object({
      exerciseId: z.string(),
      answer: z.string(),
      isCorrect: z.boolean(),
      scoreWeight: z.number().int().default(1),
    })
  ),
});

// POST /api/progress — submit lesson results, update progress, award achievements + XP
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос", details: parsed.error.flatten() }, { status: 400 });
  }
  const { lessonId, answers } = parsed.data;

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    include: { exercises: { where: { deletedAt: null } } },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
  }

  const totalWeight = lesson.exercises.reduce((s, e) => s + e.scoreWeight, 0);
  const correctWeight = answers
    .filter((a) => a.isCorrect)
    .reduce((s, a) => s + a.scoreWeight, 0);
  const score = totalWeight > 0 ? Math.round((correctWeight / totalWeight) * 100) : 0;
  const isCompleted = score >= lesson.passingScore;

  // Determine attempt number
  const prevAttempts = await db.lessonProgress.count({
    where: { userId: user.id, lessonId },
  });
  const attemptNumber = prevAttempts + 1;

  // Save progress
  const progress = await db.lessonProgress.create({
    data: {
      userId: user.id,
      lessonId,
      score,
      isCompleted,
      attemptNumber,
      answersJson: JSON.stringify(answers),
    },
  });

  // Update student profile: streak, xp, level
  let xpGained = isCompleted ? Math.round(score / 10) * 5 + 20 : Math.round(score / 10) * 2;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });
  if (profile) {
    const lastActivity = profile.lastActivityAt ? new Date(profile.lastActivityAt) : null;
    let lastDay: Date | null = lastActivity ? new Date(lastActivity) : null;
    if (lastDay) {
      lastDay.setHours(0, 0, 0, 0);
    }

    let newStreak = profile.currentStreak;
    if (!lastDay || lastDay.getTime() !== today.getTime()) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDay && lastDay.getTime() === yesterday.getTime()) {
        newStreak = profile.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const newLongest = Math.max(profile.longestStreak, newStreak);
    // Level progression: beginner (0-300), intermediate (300-1200), advanced (1200+)
    const newXp = profile.xp + xpGained;
    const newLevel =
      newXp >= 1200 ? "advanced" : newXp >= 300 ? "intermediate" : "beginner";

    await db.studentProfile.update({
      where: { userId: user.id },
      data: {
        xp: newXp,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityAt: new Date(),
        level: newLevel,
      },
    });

    // Award achievements
    const newAchievements: string[] = [];

    // First lesson completed
    if (isCompleted) {
      const completedLessonsCount = await db.lessonProgress.count({
        where: { userId: user.id, isCompleted: true },
      });

      const lessonAchievements: { code: string; count: number }[] = [
        { code: "first_lesson", count: 1 },
        { code: "lessons_5", count: 5 },
        { code: "lessons_15", count: 15 },
      ];
      for (const a of lessonAchievements) {
        if (completedLessonsCount >= a.count) {
          await awardAchievement(user.id, a.code, newAchievements);
        }
      }

      // Perfect score
      if (score === 100) {
        await awardAchievement(user.id, "perfect_lesson", newAchievements);
      }

      // Streak achievements
      const streakAchievements: { code: string; count: number }[] = [
        { code: "streak_3", count: 3 },
        { code: "streak_7", count: 7 },
        { code: "streak_30", count: 30 },
      ];
      for (const a of streakAchievements) {
        if (newStreak >= a.count) {
          await awardAchievement(user.id, a.code, newAchievements);
        }
      }
    }

    // XP achievements
    const xpAchievements: { code: string; count: number }[] = [
      { code: "xp_500", count: 500 },
      { code: "xp_2000", count: 2000 },
    ];
    for (const a of xpAchievements) {
      if (newXp >= a.count) {
        await awardAchievement(user.id, a.code, newAchievements);
      }
    }

    // Vocabulary learned (any unique komi words from completed lessons)
    const learnedWords = await db.vocabulary.count({
      where: { lesson: { lessonProgress: { some: { userId: user.id, isCompleted: true } } }, deletedAt: null },
    });
    if (learnedWords >= 50) {
      await awardAchievement(user.id, "vocabulary_50", newAchievements);
    }

    return NextResponse.json({
      progress,
      score,
      isCompleted,
      attemptNumber,
      xpGained,
      totalXp: newXp,
      newLevel,
      newStreak,
      newAchievements,
    });
  }

  return NextResponse.json({ progress, score, isCompleted, attemptNumber, xpGained });
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
  // Add XP reward
  if (achievement.xpReward > 0) {
    await db.studentProfile.update({
      where: { userId },
      data: { xp: { increment: achievement.xpReward } },
    });
  }
  newAchievements.push(achievement.title);
}

// GET /api/progress — current user's overall progress (lessons completed, xp, streak, level)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  }

  const completedLessons = await db.lessonProgress.findMany({
    where: { userId: user.id, isCompleted: true },
    select: { lessonId: true, score: true, createdAt: true },
  });

  const totalLessons = await db.lesson.count({ where: { deletedAt: null } });
  const totalModules = await db.module.count({ where: { deletedAt: null, status: "published" } });

  // Activity over last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentActivity = await db.lessonProgress.findMany({
    where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, score: true, isCompleted: true, lesson: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Build per-day activity chart
  const days: { date: string; count: number; xp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayActivity = recentActivity.filter((a) => {
      const ad = new Date(a.createdAt);
      return ad >= d && ad < next;
    });
    days.push({
      date: d.toISOString().slice(0, 10),
      count: dayActivity.length,
      xp: dayActivity.filter((a) => a.isCompleted).reduce((s, a) => s + Math.round(a.score / 10) * 5 + 20, 0),
    });
  }

  // Average score
  const avgScore =
    completedLessons.length > 0
      ? Math.round(completedLessons.reduce((s, l) => s + l.score, 0) / completedLessons.length)
      : 0;

  return NextResponse.json({
    profile,
    stats: {
      totalLessons,
      completedLessons: completedLessons.length,
      totalModules,
      avgScore,
      totalXp: profile.xp,
      streak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      level: profile.level,
      progressPercent: totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0,
    },
    activityChart: days,
    recentActivity: recentActivity.slice(0, 10),
  });
}
