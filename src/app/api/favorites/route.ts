import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/favorites — list user's favorite words
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  const where: any = { userId: user.id };
  if (q) {
    where.vocabulary = {
      OR: [
        { wordKomi: { contains: q } },
        { translationRu: { contains: q } },
      ],
    };
  }

  const favorites = await db.favorite.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      vocabulary: {
        select: {
          id: true,
          wordKomi: true,
          translationRu: true,
          transcription: true,
          exampleKomi: true,
          exampleRu: true,
          partOfSpeech: true,
          lesson: { select: { id: true, title: true, module: { select: { id: true, title: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    items: favorites,
    total: favorites.length,
  });
}

const AddFavoriteSchema = z.object({
  vocabularyId: z.string(),
  note: z.string().max(500).optional(),
});

// POST /api/favorites — add a word to favorites
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await req.json();
  const parsed = AddFavoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const { vocabularyId, note } = parsed.data;

  // Verify vocabulary exists
  const vocab = await db.vocabulary.findFirst({ where: { id: vocabularyId, deletedAt: null } });
  if (!vocab) return NextResponse.json({ error: "Слово не найдено" }, { status: 404 });

  // Upsert to handle already-favorited case
  const favorite = await db.favorite.upsert({
    where: {
      userId_vocabularyId: { userId: user.id, vocabularyId },
    },
    update: { note: note || null },
    create: { userId: user.id, vocabularyId, note: note || null },
  });

  return NextResponse.json({ favorite });
}
