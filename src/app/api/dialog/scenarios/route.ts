import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/dialog/scenarios
export async function GET() {
  const scenarios = await db.dialogScenario.findMany({
    where: { deletedAt: null },
    orderBy: [{ level: "asc" }, { createdAt: "asc" }],
  });
  const user = await getCurrentUser();

  let sessions: { scenarioId: string; count: number }[] = [];
  if (user) {
    sessions = await db.dialogSession.groupBy({
      by: ["scenarioId"],
      where: { userId: user.id },
      _count: { id: true },
    });
  }
  const sessionMap = new Map(sessions.map((s) => [s.scenarioId, s._count.id]));

  return NextResponse.json(
    scenarios.map((s) => ({
      ...s,
      scenario: JSON.parse(s.scenarioJson),
      attempts: sessionMap.get(s.id) || 0,
    }))
  );
}
