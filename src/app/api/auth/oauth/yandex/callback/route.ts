import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, hashPassword } from "@/lib/auth";

// ============================================================
// GET /api/auth/oauth/yandex/callback (REC 1.1)
// Обмен кода на токен → профиль пользователя → сессия.
// ============================================================

interface YandexUserInfo {
  id: string;
  default_email?: string;
  login?: string;
  display_name?: string;
  real_name?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/?oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?oauth_error=no_code`);
  }

  // Проверка state (защита от CSRF в OAuth-потоке)
  const cookieState = req.cookies.get("komi_oauth_state")?.value;
  if (!state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${origin}/?oauth_error=invalid_state`);
  }

  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/?oauth_error=not_configured`);
  }

  const redirectUri = `${process.env.APP_URL || origin}/api/auth/oauth/yandex/callback`;

  try {
    // 1. Обмен authorization code на access token
    const tokenRes = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      console.error("Yandex OAuth token error:", await tokenRes.text());
      return NextResponse.redirect(`${origin}/?oauth_error=token_exchange`);
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    // 2. Профиль пользователя Яндекс ID
    const infoRes = await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    });
    if (!infoRes.ok) {
      return NextResponse.redirect(`${origin}/?oauth_error=userinfo`);
    }
    const info = (await infoRes.json()) as YandexUserInfo;

    const email = info.default_email || `${info.login}@yandex.ru`;
    const fullName = info.real_name || info.display_name || info.login || null;

    // 3. Находим или создаём пользователя
    let user = await db.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Автоматическая регистрация через OAuth: случайный пароль,
      // email считается подтверждённым провайдером
      user = await db.user.create({
        data: {
          email,
          passwordHash: hashPassword(crypto.randomUUID() + crypto.randomUUID()),
          fullName,
          role: "student",
          emailVerified: true,
          pdConsentAt: new Date(), // согласие фиксируется OAuth-авторизацией
        },
      });
      await db.studentProfile.create({
        data: { userId: user.id, level: "beginner", xp: 0 },
      });
    } else if (!user.isActive) {
      return NextResponse.redirect(`${origin}/?oauth_error=blocked`);
    }

    // 4. Лог входа через OAuth
    await db.authLog.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "success_oauth_yandex",
      },
    });

    // 5. Сессия — cookie устанавливаем в ответе напрямую
    //    (Route Handler не может мутировать cookies() после старта ответа)
    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.fullName,
    });
    const res = NextResponse.redirect(origin + "/");
    res.cookies.set("komi_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.delete("komi_oauth_state");
    return res;
  } catch (e) {
    console.error("Yandex OAuth callback error:", e);
    return NextResponse.redirect(`${origin}/?oauth_error=callback_failed`);
  }
}
