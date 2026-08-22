import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const CheckSchema = z.object({
  answer: z.string(),
});

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:«»"']/g, "")
    .replace(/\s+/g, " ");
}

// POST /api/exercises/[id]/check — checks answer, returns correctness, correct answer, explanation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const exercise = await db.exercise.findFirst({ where: { id, deletedAt: null } });
  if (!exercise) {
    return NextResponse.json({ error: "Упражнение не найдено" }, { status: 404 });
  }

  const userAnswer = parsed.data.answer;
  let isCorrect = false;

  switch (exercise.type) {
    case "choice":
    case "fill_blank":
    case "translation":
      isCorrect = normalize(userAnswer) === normalize(exercise.correctAnswer);
      // For fill_blank accept answer contained in correct
      if (!isCorrect && exercise.type === "fill_blank") {
        const acceptable = normalize(exercise.correctAnswer).split(/[\s,|]/);
        isCorrect = acceptable.includes(normalize(userAnswer));
      }
      if (!isCorrect && exercise.type === "translation") {
        // allow comma/pipe-separated acceptable answers
        const acceptable = exercise.correctAnswer.split(/[|]/).map(normalize);
        isCorrect = acceptable.includes(normalize(userAnswer));
      }
      break;
    case "audio":
      isCorrect = normalize(userAnswer) === normalize(exercise.correctAnswer);
      break;
    case "matching": {
      // For matching, userAnswer is JSON with { pairs: [[left,right], ...] } — compare with correctAnswer
      try {
        const userPairs = JSON.parse(userAnswer).pairs as string[][];
        const correctPairs = JSON.parse(exercise.correctAnswer).pairs as string[][];
        if (userPairs.length !== correctPairs.length) {
          isCorrect = false;
        } else {
          isCorrect = correctPairs.every((cp) =>
            userPairs.some((up) => up[0] === cp[0] && up[1] === cp[1])
          );
        }
      } catch {
        isCorrect = false;
      }
      break;
    }
    case "order":
      isCorrect = normalize(userAnswer) === normalize(exercise.correctAnswer);
      break;
    default:
      isCorrect = normalize(userAnswer) === normalize(exercise.correctAnswer);
  }

  return NextResponse.json({
    isCorrect,
    correctAnswer: isCorrect ? null : exercise.correctAnswer,
    explanation: isCorrect ? null : exercise.explanation,
    hint: isCorrect ? null : exercise.hint,
    scoreWeight: exercise.scoreWeight,
  });
}
