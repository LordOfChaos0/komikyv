import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/quiz?moduleId=<id>&count=10
// Generates a random quiz with mixed exercise types from a specific module
// (or all modules if no moduleId specified).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");
  const count = Math.min(20, Math.max(3, parseInt(searchParams.get("count") || "10", 10)));

  // Find exercises
  const where: any = { deletedAt: null };
  if (moduleId) {
    where.lesson = { moduleId, deletedAt: null };
  }

  const exercises = await db.exercise.findMany({
    where,
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

  if (exercises.length === 0) {
    return NextResponse.json({ quiz: null, message: "Нет упражнений для генерации теста" });
  }

  // Shuffle and pick
  const shuffled = [...exercises].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Strip correct answers for client
  const safeExercises = selected.map((e, i) => ({
    id: e.id,
    orderIndex: i + 1,
    type: e.type,
    question: e.question,
    questionRu: e.questionRu,
    optionsJson: e.optionsJson,
    hint: e.hint,
    scoreWeight: e.scoreWeight,
    lesson: e.lesson,
  }));

  return NextResponse.json({
    quiz: {
      exercises: safeExercises,
      total: safeExercises.length,
      moduleId: moduleId || null,
      generatedAt: new Date().toISOString(),
    },
  });
}
