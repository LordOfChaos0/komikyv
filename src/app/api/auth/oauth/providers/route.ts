import { NextResponse } from "next/server";

// ============================================================
// GET /api/auth/oauth/providers
// Список активированных OAuth-провайдеров (REC 1.1).
// Провайдер считается активным, если заданы его env-переменные.
// ============================================================

export async function GET() {
  const providers: string[] = [];
  if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
    providers.push("yandex");
  }
  return NextResponse.json({ providers });
}
