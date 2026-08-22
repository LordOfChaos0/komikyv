import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const ExerciseSchema = z.object({
  type: z.enum(["translation", "choice", "matching", "fill_blank", "audio", "order"]),
  question: z.string().min(3).max(1000),
  questionRu: z.string().optional().nullable(),
  optionsJson: z.string().default("[]"),
  correctAnswer: z.string().min(1).max(2000),
  hint: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  scoreWeight: z.number().int().min(1).max(10).default(1),
});

async function checkAccess(lessonId: string, userId: string, role: string) {
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    include: { module: true },
  });
  if (!lesson) return { error: "Урок не найден", status: 404 };
  if (role === "teacher" && lesson.module.authorId !== userId) {
    return { error: "Нет доступа", status: 403 };
  }
  return { lesson };
}

// POST /api/teacher/lessons/[id]/exercises — create exercise in lesson
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
  const access = await checkAccess(id, user.id, user.role);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = await req.json();
  const parsed = ExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const exercise = await db.exercise.create({
    data: { lessonId: id, ...parsed.data } as any,
  });
  return NextResponse.json({ exercise });
}

// GET /api/teacher/lessons/[id]/exercises — list exercises
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
  const access = await checkAccess(id, user.id, user.role);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const exercises = await db.exercise.findMany({
    where: { lessonId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ items: exercises });
}
