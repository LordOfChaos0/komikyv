import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ============================================================
// GET /api/auth/2fa/status — состояние 2FA текущего пользователя
// Сам секрет не возвращается.
// ============================================================

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const dbUser = await db.user.findFirst({
    where: { id: user.id },
    select: { totpEnabled: true, totpSecret: true },
  });

  return NextResponse.json({
    enabled: !!dbUser?.totpEnabled,
    hasPendingSecret: !dbUser?.totpEnabled && !!dbUser?.totpSecret,
  });
}
