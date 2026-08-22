import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const UpdateSchema = z.object({
  type: z.enum(["translation", "choice", "matching", "fill_blank", "audio", "order"]).optional(),
  question: z.string().min(3).max(1000).optional(),
  questionRu: z.string().optional().nullable(),
  optionsJson: z.string().optional(),
  correctAnswer: z.string().min(1).max(2000).optional(),
  hint: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  scoreWeight: z.number().int().min(1).max(10).optional(),
});

async function checkAccess(exerciseId: string, userId: string, role: string) {
  const ex = await db.exercise.findFirst({
    where: { id: exerciseId, deletedAt: null },
    include: { lesson: { include: { module: true } } },
  });
  if (!ex) return { error: "Упражнение не найдено", status: 404 };
  if (role === "teacher" && ex.lesson.module.authorId !== userId) {
    return { error: "Нет доступа", status: 403 };
  }
  return { ex };
}

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
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await db.exercise.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json({ exercise: updated });
}

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
  await db.exercise.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
