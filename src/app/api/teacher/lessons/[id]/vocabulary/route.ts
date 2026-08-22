import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const VocabSchema = z.object({
  wordKomi: z.string().min(1).max(255),
  translationRu: z.string().min(1).max(255),
  transcription: z.string().optional().nullable(),
  exampleKomi: z.string().optional().nullable(),
  exampleRu: z.string().optional().nullable(),
  partOfSpeech: z.string().optional().nullable(),
});

// POST /api/teacher/lessons/[id]/vocabulary
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
  const lesson = await db.lesson.findFirst({
    where: { id, deletedAt: null },
    include: { module: true },
  });
  if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
  if (user.role === "teacher" && lesson.module.authorId !== user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = VocabSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const vocab = await db.vocabulary.create({ data: { lessonId: id, ...parsed.data } as any });
  return NextResponse.json({ vocabulary: vocab });
}

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
  const lesson = await db.lesson.findFirst({
    where: { id, deletedAt: null },
    include: { module: true },
  });
  if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
  if (user.role === "teacher" && lesson.module.authorId !== user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const vocab = await db.vocabulary.findMany({
    where: { lessonId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ items: vocab });
}
