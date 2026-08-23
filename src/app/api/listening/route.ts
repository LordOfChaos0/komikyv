import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/listening — returns a random Komi sentence for listening practice
// Pulls from vocabulary exampleKomi fields (so we always have a translation).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") || ""; // beginner | intermediate | advanced

  // Find vocabulary that has exampleKomi set
  const where: any = {
    deletedAt: null,
    NOT: { exampleKomi: null },
  };
  if (level) {
    where.lesson = { module: { level } };
  }

  const total = await db.vocabulary.count({ where });
  if (total === 0) {
    return NextResponse.json({ sentence: null });
  }

  // Pick a random one
  const skip = Math.floor(Math.random() * total);
  const word = await db.vocabulary.findFirst({
    where,
    skip,
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

  if (!word || !word.exampleKomi) {
    return NextResponse.json({ sentence: null });
  }

  return NextResponse.json({
    sentence: {
      id: word.id,
      text: word.exampleKomi,
      translation: word.exampleRu || word.translationRu,
      wordKomi: word.wordKomi,
      wordRu: word.translationRu,
      transcription: word.transcription,
      lesson: word.lesson,
    },
    total,
  });
}
