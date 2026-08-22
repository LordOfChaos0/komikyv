import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET /api/admin/dashboard — overall platform stats
export async function GET() {
  let user;
  try {
    user = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalModules,
    publishedModules,
    onModerationModules,
    draftModules,
    totalLessons,
    totalExercises,
    totalVocabulary,
    totalDialogs,
    finishedDialogs,
    totalAchievements,
    totalProgress,
    authLogsSuccess,
    authLogsFailed,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { role: "student", deletedAt: null } }),
    db.user.count({ where: { role: "teacher", deletedAt: null } }),
    db.user.count({ where: { role: "admin", deletedAt: null } }),
    db.module.count({ where: { deletedAt: null } }),
    db.module.count({ where: { status: "published", deletedAt: null } }),
    db.module.count({ where: { status: "on_moderation", deletedAt: null } }),
    db.module.count({ where: { status: "draft", deletedAt: null } }),
    db.lesson.count({ where: { deletedAt: null } }),
    db.exercise.count({ where: { deletedAt: null } }),
    db.vocabulary.count({ where: { deletedAt: null } }),
    db.dialogSession.count(),
    db.dialogSession.count({ where: { status: "finished" } }),
    db.achievement.count(),
    db.lessonProgress.count(),
    db.authLog.count({ where: { status: "success" } }),
    db.authLog.count({ where: { status: "failed" } }),
  ]);

  // Registrations over last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const recentUsers = await db.user.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { createdAt: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const registrationsChart: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    registrationsChart.push({
      date: d.toISOString().slice(0, 10),
      count: recentUsers.filter((u) => {
        const ad = new Date(u.createdAt);
        return ad >= d && ad < next;
      }).length,
    });
  }

  // Activity (lesson progress) over last 14 days
  const recentProgress = await db.lessonProgress.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { createdAt: true, isCompleted: true },
  });
  const activityChart: { date: string; count: number; completed: number }[] = [];
  for (let i = 13; i >= 0; i--) {
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
      count: dayActivity.length,
      completed: dayActivity.filter((p) => p.isCompleted).length,
    });
  }

  // Top users by XP
  const topUsers = await db.studentProfile.findMany({
    orderBy: { xp: "desc" },
    take: 5,
    include: { user: { select: { email: true, fullName: true } } },
  });

  return NextResponse.json({
    users: { total: totalUsers, students: totalStudents, teachers: totalTeachers, admins: totalAdmins },
    content: {
      modules: totalModules,
      publishedModules,
      onModerationModules,
      draftModules,
      lessons: totalLessons,
      exercises: totalExercises,
      vocabulary: totalVocabulary,
      achievements: totalAchievements,
    },
    activity: {
      totalProgress,
      totalDialogs,
      finishedDialogs,
      authLogsSuccess,
      authLogsFailed,
    },
    charts: {
      registrations: registrationsChart,
      activity: activityChart,
    },
    topUsers: topUsers.map((t) => ({
      name: t.user.fullName || t.user.email,
      xp: t.xp,
      level: t.level,
      streak: t.currentStreak,
    })),
  });
}
