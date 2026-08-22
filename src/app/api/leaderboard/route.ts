import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/leaderboard — top students by XP
export async function GET() {
  const top = await db.studentProfile.findMany({
    orderBy: { xp: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });
  const me = await getCurrentUser();
  const myEntry = me ? top.find((t) => t.userId === me.id) : null;
  const myRank = me ? top.findIndex((t) => t.userId === me.id) + 1 : null;

  return NextResponse.json({
    top: top.map((t, i) => ({
      rank: i + 1,
      userId: t.userId,
      name: t.user.fullName || t.user.email,
      xp: t.xp,
      level: t.level,
      streak: t.currentStreak,
      isMe: me?.id === t.userId,
    })),
    myRank,
    myXp: myEntry?.xp ?? null,
  });
}
