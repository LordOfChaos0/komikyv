import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/vocabulary — paginated, searchable, filterable
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const moduleId = searchParams.get("moduleId") || "";
  const lessonId = searchParams.get("lessonId") || "";
  const partOfSpeech = searchParams.get("partOfSpeech") || "";
  const sort = searchParams.get("sort") || "newest"; // newest|az_komi|az_ru
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

  const where: any = { deletedAt: null };
  if (q) {
    where.OR = [
      { wordKomi: { contains: q } },
      { translationRu: { contains: q } },
      { transcription: { contains: q } },
      { exampleKomi: { contains: q } },
      { exampleRu: { contains: q } },
    ];
  }
  if (lessonId) where.lessonId = lessonId;
  if (moduleId) where.lesson = { moduleId };
  if (partOfSpeech) where.partOfSpeech = partOfSpeech;

  const orderBy: any =
    sort === "az_komi" ? { wordKomi: "asc" } :
    sort === "az_ru" ? { translationRu: "asc" } :
    { createdAt: "desc" };

  const [total, items] = await Promise.all([
    db.vocabulary.count({ where }),
    db.vocabulary.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lesson: { select: { id: true, title: true, module: { select: { id: true, title: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
