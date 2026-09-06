import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyPassword, signToken, setSessionCookie, getRequestMeta,
  signChallengeToken, verifyChallengeToken,
} from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

const LoginSchema = z
  .object({
    email: z.string().email("Некорректный email").optional(),
    password: z.string().min(1, "Введите пароль").optional(),
    // Второй шаг (2FA): код из приложения-аутентификатора
    code: z.string().optional(),
    // Второй шаг (2FA): токен-вызов, полученный после проверки пароля
    challengeToken: z.string().optional(),
  })
  .refine((v) => (v.email && v.password) || v.challengeToken, {
    message: "Укажите email и пароль (или токен-вызов второго шага)",
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, code, challengeToken } = parsed.data;
    const { ip, ua } = getRequestMeta(req);

    // ========================================================
    // Шаг 2: проверка пароля уже выполнена — принимаем код TOTP
    // ========================================================
    if (challengeToken) {
      const challenge = verifyChallengeToken(challengeToken);
      if (!challenge) {
        return NextResponse.json(
          { error: "Сессия ввода кода истекла. Начните вход заново." },
          { status: 401 }
        );
      }
      const user = await db.user.findFirst({
        where: { id: challenge.sub, deletedAt: null, isActive: true },
      });
      if (!user || !user.totpEnabled || !user.totpSecret) {
        return NextResponse.json(
          { error: "Двухфакторная аутентификация недоступна. Обратитесь к администратору." },
          { status: 400 }
        );
      }
      if (!code || !verifyTotp(user.totpSecret, code, user.totpLastCode)) {
        await db.authLog.create({
          data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "2fa_failed" },
        });
        return NextResponse.json(
          { error: "Неверный или просроченный код. Проверьте приложение-аутентификатор." },
          { status: 401 }
        );
      }
      // Код принят: фиксируем (защита от повторного использования)
      await db.user.update({
        where: { id: user.id },
        data: { totpLastCode: code },
      });
      await db.authLog.create({
        data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "success_2fa" },
      });
      const token = signToken({
        sub: user.id, email: user.email, role: user.role, name: user.fullName, twofa: true,
      });
      await setSessionCookie(token);
      return NextResponse.json({
        user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      });
    }

    // ========================================================
    // Шаг 1: email + пароль
    // ========================================================
    if (!email || !password) {
      return NextResponse.json({ error: "Укажите email и пароль" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { email } });

    if (!user || user.deletedAt || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      await db.authLog.create({
        data: { userId: user?.id || null, email, ipAddress: ip, userAgent: ua, status: "failed" },
      });
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    // У пользователя включена 2FA — сначала пароль (уже ок), затем код
    if (user.totpEnabled && user.totpSecret) {
      if (code) {
        // Одношаговый вход: код передан вместе с паролем
        if (!verifyTotp(user.totpSecret, code, user.totpLastCode)) {
          await db.authLog.create({
            data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "2fa_failed" },
          });
          return NextResponse.json(
            { error: "Неверный или просроченный код. Проверьте приложение-аутентификатор." },
            { status: 401 }
          );
        }
        await db.user.update({ where: { id: user.id }, data: { totpLastCode: code } });
        await db.authLog.create({
          data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "success_2fa" },
        });
        const token = signToken({
          sub: user.id, email: user.email, role: user.role, name: user.fullName, twofa: true,
        });
        await setSessionCookie(token);
        return NextResponse.json({
          user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
        });
      }

      // Кода нет — выдаём токен-вызов и ждём второй шаг
      await db.authLog.create({
        data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "2fa_pending" },
      });
      return NextResponse.json({
        requires2FA: true,
        challengeToken: signChallengeToken(user.id, user.email),
        message: "Введите код из приложения-аутентификатора",
      });
    }

    // 2FA не включена — обычная сессия
    await db.authLog.create({
      data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "success" },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.fullName });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
