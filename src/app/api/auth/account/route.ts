import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, verifyPassword, clearSessionCookie, getRequestMeta } from "@/lib/auth";

// ============================================================
// DELETE /api/auth/account — удаление собственного аккаунта
// (152-ФЗ: право пользователя на отзыв согласия и удаление ПД)
//
// Модель: soft delete + анонимизация. Запись User помечается
// deletedAt, email/имя заменяются на обезличенные, пароль и
// 2FA-секреты перезаписываются, персональные уведомления
// удаляются. Агрегированная статистика (прогресс уроков, SRS)
// сохраняется без ПД для отчётности платформы.
// ============================================================

const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Введите пароль для подтверждения"),
  confirmed: z.boolean().refine((v) => v === true, "Требуется подтверждение необратимости"),
});

export async function DELETE(req: NextRequest) {
  try {
    // 1. Авторизация
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // 2. Валидация тела запроса
    const parsed = DeleteAccountSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { password } = parsed.data;

    // 3. Полная запись пользователя (включая hash пароля)
    const user = await db.user.findFirst({
      where: { id: session.id, deletedAt: null },
    });
    if (!user) {
      return NextResponse.json({ error: "Аккаунт не найден или уже удалён" }, { status: 404 });
    }

    // 4. Проверка пароля — защита от удаления при угонённой сессии
    if (!verifyPassword(password, user.passwordHash)) {
      const { ip, ua } = getRequestMeta(req);
      await db.authLog
        .create({
          data: {
            userId: user.id,
            email: user.email,
            ipAddress: ip,
            userAgent: ua,
            status: "failed",
          },
        })
        .catch(() => null);
      return NextResponse.json(
        { error: "Неверный пароль. Удаление отменено." },
        { status: 401 }
      );
    }

    // 5. Анонимизация + soft delete (единая транзакция)
    const deletedAt = new Date();
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          deletedAt,
          isActive: false,
          // Обезличивание ПД (152-ФЗ): email освобождается для
          // повторной регистрации, имя удаляется, секреты затираются
          email: `deleted-${user.id}@removed.komikyv.local`,
          fullName: null,
          passwordHash: `removed$${user.id}$${deletedAt.getTime()}`,
          verificationCode: null,
          codeExpiresAt: null,
          totpSecret: null,
          totpEnabled: false,
          totpLastCode: null,
          pdConsentAt: null,
        },
      }),
      // Персональные уведомления могут содержать имя — удаляем
      db.notification.deleteMany({ where: { userId: user.id } }),
      // Личные заметки в избранном — тоже ПД пользователя
      db.favorite.updateMany({
        where: { userId: user.id },
        data: { note: null },
      }),
    ]);

    // 6. Аудит: кто и что удалил (email сохраняем только в логе
    // безопасности, доступном админу, — обоснование обработки)
    const { ip, ua } = getRequestMeta(req);
    await db.auditLog
      .create({
        data: {
          userId: user.id,
          entityType: "user",
          entityId: user.id,
          action: "self_delete",
          oldValuesJson: JSON.stringify({ email: user.email, role: user.role }),
          newValuesJson: JSON.stringify({ deletedAt: deletedAt.toISOString(), anonymized: true }),
        },
      })
      .catch(() => null);

    await db.authLog
      .create({
        data: {
          userId: null, // связь SetNull: пользователь обезличен
          email: user.email,
          ipAddress: ip,
          userAgent: ua,
          status: "logout",
        },
      })
      .catch(() => null);

    // 7. Завершаем сессию
    await clearSessionCookie();

    return NextResponse.json({
      ok: true,
      message: "Аккаунт удалён. Персональные данные анонимизированы.",
    });
  } catch (e) {
    console.error("Delete account error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
