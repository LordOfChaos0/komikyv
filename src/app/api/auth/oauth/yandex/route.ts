import { NextRequest, NextResponse } from "next/server";

// ============================================================
// GET /api/auth/oauth/yandex (REC 1.1)
// Редирект на страницу авторизации Яндекс ID.
// Активируется env-переменными YANDEX_CLIENT_ID / YANDEX_CLIENT_SECRET.
// ============================================================

export async function GET(req: NextRequest) {
  const clientId = process.env.YANDEX_CLIENT_ID;
  if (!clientId || !process.env.YANDEX_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "OAuth-вход через Яндекс не настроен на сервере" },
      { status: 501 }
    );
  }

  // Формируем redirect_uri изOrigin запроса (поддержка любого домена деплоя)
  const origin =
    process.env.APP_URL ||
    req.headers.get("origin") ||
    new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/oauth/yandex/callback`;

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    force_confirm: "yes",
    state,
  });

  const res = NextResponse.redirect(`https://oauth.yandex.ru/authorize?${params.toString()}`);
  // state защищает от CSRF при OAuth-редиректе
  res.cookies.set("komi_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 минут
  });
  return res;
}
