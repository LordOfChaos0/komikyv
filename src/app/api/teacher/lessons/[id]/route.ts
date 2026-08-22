import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const UpdateLessonSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  theoryContent: z.string().optional().nullable(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(20).optional().nullable(),
  orderIndex: z.number().int().min(1).optional(),
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

// PUT /api/teacher/lessons/[id]
export async function PUT(
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
  const parsed = UpdateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await db.lesson.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json({ lesson: updated });
}

// DELETE /api/teacher/lessons/[id]
export async function DELETE(
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
  await db.lesson.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
