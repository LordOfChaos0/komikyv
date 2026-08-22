import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/lessons/[id] — lesson with exercises + vocabulary (for player)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const lesson = await db.lesson.findFirst({
    where: { id, deletedAt: null },
    include: {
      module: { select: { id: true, title: true, level: true } },
      exercises: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
      vocabulary: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
  }

  // Determine if lesson is unlocked (previous lesson completed) for students
  let unlocked = true;
  let prevLessonId: string | null = null;
  if (user) {
    const prev = await db.lesson.findFirst({
      where: { moduleId: lesson.moduleId, deletedAt: null, orderIndex: { lt: lesson.orderIndex } },
      orderBy: { orderIndex: "desc" },
      select: { id: true, orderIndex: true },
    });
    if (prev) {
      prevLessonId = prev.id;
      const prevProgress = await db.lessonProgress.findFirst({
        where: { userId: user.id, lessonId: prev.id, isCompleted: true },
      });
      unlocked = !!prevProgress;
    }
  }

  // For students, hide correct answers from the response to prevent cheating
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";
  const safeExercises = lesson.exercises.map((e) =>
    isTeacherOrAdmin
      ? e
      : {
          id: e.id,
          type: e.type,
          question: e.question,
          questionRu: e.questionRu,
          optionsJson: e.optionsJson,
          hint: e.hint,
          scoreWeight: e.scoreWeight,
          // correctAnswer omitted for students
        }
  );

  return NextResponse.json({
    ...lesson,
    exercises: safeExercises,
    unlocked,
    prevLessonId,
  });
}
