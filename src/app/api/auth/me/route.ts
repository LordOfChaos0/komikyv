import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const [profile, dbUser] = await Promise.all([
    db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { level: true, xp: true, currentStreak: true, longestStreak: true, lastActivityAt: true },
    }),
    db.user.findFirst({
      where: { id: user.id },
      select: { emailVerified: true },
    }),
  ]);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      isActive: user.isActive,
      emailVerified: dbUser?.emailVerified ?? false,
      profile,
    },
  });
}
