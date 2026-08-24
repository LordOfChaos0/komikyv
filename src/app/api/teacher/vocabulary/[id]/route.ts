import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const UpdateSchema = z.object({
  wordKomi: z.string().min(1).max(255).optional(),
  translationRu: z.string().min(1).max(255).optional(),
  transcription: z.string().optional().nullable(),
  exampleKomi: z.string().optional().nullable(),
  exampleRu: z.string().optional().nullable(),
  partOfSpeech: z.string().optional().nullable(),
});

async function checkAccess(vocabId: string, userId: string, role: string) {
  const v = await db.vocabulary.findFirst({
    where: { id: vocabId, deletedAt: null },
    include: { lesson: { include: { module: true } } },
  });
  if (!v) return { error: "Слово не найдено", status: 404 };
  if (role === "teacher" && v.lesson?.module?.authorId !== userId) {
    return { error: "Нет доступа", status: 403 };
  }
  return { v };
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
  const updated = await db.vocabulary.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json({ vocabulary: updated });
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
  await db.vocabulary.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
