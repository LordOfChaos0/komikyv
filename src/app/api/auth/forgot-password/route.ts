import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateVerificationCode, sendPasswordResetEmail } from "@/lib/mailer";

// ============================================================
// POST /api/auth/forgot-password (REC 1.1)
// Запрос кода восстановления пароля. Всегда отвечает 200,
// чтобы не раскрывать существование email в базе.
// ============================================================

const ForgotSchema = z.object({
  email: z.string().email("Некорректный email"),
});

const CODE_TTL_MS = 15 * 60 * 1000; // 15 минут

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ForgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    const user = await db.user.findFirst({
      where: { email, deletedAt: null, isActive: true },
    });

    if (user) {
      const code = generateVerificationCode();
      await db.user.update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          codeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
      const result = await sendPasswordResetEmail(email, code, user.fullName);
      // devCode возвращается только когда SMTP не настроен (dev-режим),
      // чтобы можно было протестировать поток локально
      if (result.devCode && process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          message: "Код восстановления отправлен (dev-режим: SMTP не настроен)",
          devCode: result.devCode,
        });
      }
    }

    // Единый ответ независимо от существования аккаунта
    return NextResponse.json({
      message: "Если аккаунт с таким email существует, код восстановления отправлен",
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
