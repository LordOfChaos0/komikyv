import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// ============================================================
// POST /api/auth/reset-password (REC 1.1)
// Установка нового пароля по коду из письма.
// ============================================================

const ResetSchema = z.object({
  email: z.string().email("Некорректный email"),
  code: z.string().length(6, "Код состоит из 6 цифр"),
  newPassword: z
    .string()
    .min(8, "Пароль должен быть не короче 8 символов")
    .max(128, "Пароль слишком длинный")
    .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать буквы")
    .regex(/[0-9]/, "Пароль должен содержать цифры"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, code, newPassword } = parsed.data;

    const user = await db.user.findFirst({
      where: { email, deletedAt: null, isActive: true },
    });

    const invalid = NextResponse.json(
      { error: "Неверный или истёкший код восстановления" },
      { status: 400 }
    );

    if (!user || !user.verificationCode || !user.codeExpiresAt) {
      return invalid;
    }
    if (user.verificationCode !== code) {
      return invalid;
    }
    if (user.codeExpiresAt.getTime() < Date.now()) {
      return invalid;
    }

    // Устанавливаем новый пароль и очищаем код
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    // Аудит: фиксируем сброс пароля (без пароля, только факт)
    await db.authLog.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "password_reset",
      },
    });

    return NextResponse.json({ message: "Пароль успешно изменён. Теперь войдите с новым паролем." });
  } catch (e) {
    console.error("Reset password error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
