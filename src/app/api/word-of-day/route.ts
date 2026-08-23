import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/word-of-day
// Returns a deterministic "word of the day" — same word for the whole day,
// cycles through all vocabulary entries. Includes related words from the same lesson.
export async function GET() {
  // Count all vocabulary
  const total = await db.vocabulary.count({ where: { deletedAt: null } });
  if (total === 0) {
    return NextResponse.json({ word: null });
  }

  // Deterministic index based on day of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = dayOfYear % total;

  const word = await db.vocabulary.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    skip: index,
    take: 1,
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          module: { select: { id: true, title: true, level: true } },
        },
      },
    },
  });

  if (!word) {
    return NextResponse.json({ word: null });
  }

  // Get 3 related words from the same lesson (if any)
  let related: any[] = [];
  if (word.lessonId) {
    related = await db.vocabulary.findMany({
      where: { lessonId: word.lessonId, deletedAt: null, id: { not: word.id } },
      take: 3,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        wordKomi: true,
        translationRu: true,
        transcription: true,
        partOfSpeech: true,
      },
    });
  }

  return NextResponse.json({
    word: {
      id: word.id,
      wordKomi: word.wordKomi,
      translationRu: word.translationRu,
      transcription: word.transcription,
      exampleKomi: word.exampleKomi,
      exampleRu: word.exampleRu,
      partOfSpeech: word.partOfSpeech,
      lesson: word.lesson,
      related,
    },
    dayOfYear,
    totalWords: total,
  });
}
