import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const LessonSchema = z.object({
  title: z.string().min(2).max(200),
  theoryContent: z.string().optional(),
  passingScore: z.number().int().min(0).max(100).default(70),
  maxAttempts: z.number().int().min(1).max(20).optional().nullable(),
});

// POST /api/teacher/modules/[id]/lessons — create lesson in module
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { id } = await params;
  const mod = await db.module.findFirst({ where: { id, deletedAt: null } });
  if (!mod) return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  if (user.role === "teacher" && mod.authorId !== user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = LessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const existingCount = await db.lesson.count({ where: { moduleId: id, deletedAt: null } });
  const lesson = await db.lesson.create({
    data: {
      moduleId: id,
      title: parsed.data.title,
      theoryContent: parsed.data.theoryContent || null,
      passingScore: parsed.data.passingScore,
      maxAttempts: parsed.data.maxAttempts || null,
      orderIndex: existingCount + 1,
    },
  });
  return NextResponse.json({ lesson });
}

// GET /api/teacher/modules/[id]/lessons — list lessons in module
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { id } = await params;
  const mod = await db.module.findFirst({ where: { id, deletedAt: null } });
  if (!mod) return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  if (user.role === "teacher" && mod.authorId !== user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const lessons = await db.lesson.findMany({
    where: { moduleId: id, deletedAt: null },
    orderBy: { orderIndex: "asc" },
    include: {
      _count: {
        select: {
          exercises: { where: { deletedAt: null } },
          vocabulary: { where: { deletedAt: null } },
        },
      },
    },
  });
  return NextResponse.json({
    items: lessons.map((l) => ({
      ...l,
      exercisesCount: (l as any)._count?.exercises ?? 0,
      vocabularyCount: (l as any)._count?.vocabulary ?? 0,
    })),
  });
}
