import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/modules — list published modules with filters/search/pagination
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const level = searchParams.get("level") || ""; // beginner|intermediate|advanced
  const category = searchParams.get("category") || ""; // slug
  const sort = searchParams.get("sort") || "newest"; // newest|popular|az|level
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(20, Math.max(1, parseInt(searchParams.get("pageSize") || "9", 10)));
  const status = searchParams.get("status") || "published"; // for teacher: 'mine'

  const user = await getCurrentUser();

  // Teacher viewing own modules (any status)
  const isTeacherOwn = status === "mine" && user?.role === "teacher";

  const where: any = { deletedAt: null };
  if (isTeacherOwn) {
    where.authorId = user!.id;
  } else {
    where.status = "published";
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (level) where.level = level;
  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }

  const orderBy: any =
    sort === "az" ? { title: "asc" } :
    sort === "level" ? [{ level: "asc" }, { createdAt: "desc" }] :
    sort === "popular" ? { publishedAt: "desc" } :
    { createdAt: "desc" };

  const [total, modules] = await Promise.all([
    db.module.count({ where }),
    db.module.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { fullName: true, email: true } },
        categories: { include: { category: true } },
        _count: { select: { lessons: { where: { deletedAt: null } } } },
      },
    }),
  ]);

  // If user is student, attach progress
  let progressMap: Record<string, any> = {};
  if (user && !isTeacherOwn) {
    const moduleIds = modules.map((m) => m.id);
    const lessons = await db.lesson.findMany({
      where: { moduleId: { in: moduleIds }, deletedAt: null },
      select: { id: true, moduleId: true },
    });
    const lessonIds = lessons.map((l) => l.id);
    const completed = await db.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessonIds }, isCompleted: true },
      select: { lessonId: true, score: true },
    });
    const completedByModule: Record<string, { done: number; totalScore: number }> = {};
    for (const l of lessons) {
      completedByModule[l.moduleId] = completedByModule[l.moduleId] || { done: 0, totalScore: 0 };
    }
    for (const c of completed) {
      const lesson = lessons.find((l) => l.id === c.lessonId);
      if (lesson) {
        const entry = completedByModule[lesson.moduleId];
        entry.done += 1;
        entry.totalScore += c.score;
      }
    }
    progressMap = completedByModule;
  }

  const result = modules.map((m) => {
    const totalLessons = (m as any)._count?.lessons ?? 0;
    const prog = progressMap[m.id] || { done: 0, totalScore: 0 };
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      level: m.level,
      status: m.status,
      coverColor: m.coverColor,
      estimatedMin: m.estimatedMin,
      createdAt: m.createdAt,
      publishedAt: m.publishedAt,
      author: m.author,
      categories: m.categories.map((mc) => mc.category),
      lessonsCount: totalLessons,
      completedLessons: prog.done || 0,
      avgScore: totalLessons > 0 && prog.done > 0 ? Math.round(prog.totalScore / prog.done) : 0,
      progress: totalLessons > 0 ? Math.round((prog.done / totalLessons) * 100) : 0,
    };
  });

  return NextResponse.json({
    items: result,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
