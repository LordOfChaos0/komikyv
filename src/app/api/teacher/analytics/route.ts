import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/teacher/analytics — analytics for teacher's modules
// Returns: module stats (enrollment, completion, avg scores), student progress, recent activity
export async function GET() {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  // Get teacher's modules
  const where: any = { deletedAt: null };
  if (user.role === "teacher") {
    where.authorId = user.id;
  }

  const modules = await db.module.findMany({
    where,
    include: {
      _count: {
        select: {
          lessons: { where: { deletedAt: null } },
        },
      },
      lessons: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          _count: {
            select: {
              exercises: { where: { deletedAt: null } },
              vocabulary: { where: { deletedAt: null } },
              lessonProgress: { where: { isCompleted: true } },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all lesson IDs from teacher's modules
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

  // Get all progress records for these lessons
  const allProgress = await db.lessonProgress.findMany({
    where: { lessonId: { in: lessonIds } },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          studentProfile: { select: { xp: true, level: true, currentStreak: true } },
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          module: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Unique students who attempted any of teacher's lessons
  const studentMap = new Map<string, any>();
  for (const p of allProgress) {
    if (!studentMap.has(p.userId)) {
      studentMap.set(p.userId, {
        id: p.userId,
        name: p.user.fullName || p.user.email,
        email: p.user.email,
        xp: p.user.studentProfile?.xp || 0,
        level: p.user.studentProfile?.level || "beginner",
        streak: p.user.studentProfile?.currentStreak || 0,
        lessonsAttempted: 0,
        lessonsCompleted: 0,
        avgScore: 0,
        scores: [] as number[],
        lastActivity: p.createdAt,
      });
    }
    const s = studentMap.get(p.userId)!;
    s.lessonsAttempted += 1;
    if (p.isCompleted) s.lessonsCompleted += 1;
    s.scores.push(p.score);
    if (p.createdAt > s.lastActivity) s.lastActivity = p.createdAt;
  }
  const students = Array.from(studentMap.values()).map((s) => ({
    ...s,
    avgScore: s.scores.length > 0 ? Math.round(s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length) : 0,
    scores: undefined,
  }));

  // Module stats
  const moduleStats = modules.map((m) => {
    const moduleLessonIds = m.lessons.map((l) => l.id);
    const moduleProgress = allProgress.filter((p) => moduleLessonIds.includes(p.lessonId));
    const uniqueStudents = new Set(moduleProgress.map((p) => p.userId)).size;
    const completed = moduleProgress.filter((p) => p.isCompleted).length;
    const avgScore = moduleProgress.length > 0
      ? Math.round(moduleProgress.reduce((s, p) => s + p.score, 0) / moduleProgress.length)
      : 0;
    return {
      id: m.id,
      title: m.title,
      level: m.level,
      status: m.status,
      lessonsCount: m.lessons.length,
      enrollments: uniqueStudents,
      completions: completed,
      avgScore,
      publishedAt: m.publishedAt,
    };
  });

  // Overall stats
  const totalStudents = students.length;
  const totalCompletions = allProgress.filter((p) => p.isCompleted).length;
  const totalAttempts = allProgress.length;
  const overallAvg = totalAttempts > 0 ? Math.round(allProgress.reduce((s, p) => s + p.score, 0) / totalAttempts) : 0;

  // Activity over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentProgress = allProgress.filter((p) => p.createdAt >= thirtyDaysAgo);
  const activityChart: { date: string; attempts: number; completed: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayActivity = recentProgress.filter((p) => {
      const ad = new Date(p.createdAt);
      return ad >= d && ad < next;
    });
    activityChart.push({
      date: d.toISOString().slice(0, 10),
      attempts: dayActivity.length,
      completed: dayActivity.filter((p) => p.isCompleted).length,
    });
  }

  // Hardest lessons (lowest avg score)
  const lessonStats = modules.flatMap((m) =>
    m.lessons.map((l) => {
      const lessonProgress = allProgress.filter((p) => p.lessonId === l.id);
      const avg = lessonProgress.length > 0
        ? Math.round(lessonProgress.reduce((s, p) => s + p.score, 0) / lessonProgress.length)
        : null;
      return {
        moduleId: m.id,
        moduleTitle: m.title,
        lessonId: l.id,
        lessonTitle: l.title,
        orderIndex: l.orderIndex,
        attempts: lessonProgress.length,
        completions: lessonProgress.filter((p) => p.isCompleted).length,
        avgScore: avg,
      };
    })
  );
  const hardestLessons = lessonStats
    .filter((l) => l.avgScore !== null)
    .sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))
    .slice(0, 5);

  return NextResponse.json({
    overview: {
      totalModules: modules.length,
      totalStudents,
      totalCompletions,
      totalAttempts,
      overallAvg,
    },
    moduleStats,
    students,
    activityChart,
    hardestLessons,
    recentActivity: allProgress.slice(0, 10).map((p) => ({
      studentName: p.user.fullName || p.user.email,
      lessonTitle: p.lesson.title,
      moduleTitle: p.lesson.module.title,
      score: p.score,
      isCompleted: p.isCompleted,
      createdAt: p.createdAt,
    })),
  });
}
