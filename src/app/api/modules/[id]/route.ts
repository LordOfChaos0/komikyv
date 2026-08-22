import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/modules/[id] — full module detail with lessons and progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const mod = await db.module.findFirst({
    where: { id, deletedAt: null },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
      categories: { include: { category: true } },
      lessons: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { exercises: { where: { deletedAt: null } } } } },
      },
    },
  });
  if (!mod) {
    return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  }
  // Visibility check: non-published modules only visible to author/admin
  if (mod.status !== "published") {
    if (!user || (user.role !== "admin" && user.id !== mod.authorId)) {
      return NextResponse.json({ error: "Модуль недоступен" }, { status: 403 });
    }
  }

  // Attach progress for student + compute unlock status per lesson
  let lessonsWithProgress: any[] = mod.lessons;
  if (user) {
    const lessonIds = mod.lessons.map((l) => l.id);
    const progresses = await db.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessonIds } },
      orderBy: { createdAt: "desc" },
    });
    const bestByLesson: Record<string, { score: number; isCompleted: boolean; attempts: number }> = {};
    for (const p of progresses) {
      const cur = bestByLesson[p.lessonId];
      if (!cur) {
        bestByLesson[p.lessonId] = { score: p.score, isCompleted: p.isCompleted, attempts: 1 };
      } else {
        cur.attempts += 1;
        if (p.score > cur.score) cur.score = p.score;
        if (p.isCompleted) cur.isCompleted = true;
      }
    }
    // Compute unlock: a lesson is unlocked if it's the first lesson (orderIndex=1)
    // OR the previous lesson (by orderIndex) is completed.
    lessonsWithProgress = mod.lessons.map((l) => {
      const prev = mod.lessons.find((x) => x.orderIndex === l.orderIndex - 1);
      const unlocked = !prev || !!bestByLesson[prev.id]?.isCompleted;
      return {
        ...l,
        bestScore: bestByLesson[l.id]?.score ?? null,
        isCompleted: bestByLesson[l.id]?.isCompleted ?? false,
        attempts: bestByLesson[l.id]?.attempts ?? 0,
        unlocked,
      };
    });
  } else {
    // For guests, only first lesson unlocked
    lessonsWithProgress = mod.lessons.map((l) => ({
      ...l,
      bestScore: null,
      isCompleted: false,
      attempts: 0,
      unlocked: l.orderIndex === 1,
    }));
  }

  return NextResponse.json({
    ...mod,
    lessons: lessonsWithProgress,
  });
}
