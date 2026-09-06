import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, signToken, setSessionCookie } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

// ============================================================
// POST /api/auth/2fa/enable — подтверждение включения 2FA
// Принимает код из приложения-аутентификатора, активирует
// секрет и повышает текущую сессию до twofa: true.
// ============================================================

const EnableSchema = z.object({
  code: z.string().length(6, "Код состоит из 6 цифр"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

    const body = await req.json();
    const parsed = EnableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findFirst({ where: { id: user.id, deletedAt: null } });
    if (!dbUser) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    if (dbUser.totpEnabled) {
      return NextResponse.json({ error: "Двухфакторная аутентификация уже включена" }, { status: 400 });
    }
    if (!dbUser.totpSecret) {
      return NextResponse.json(
        { error: "Секрет не найден — сначала вызовите подготовку (setup)" },
        { status: 400 }
      );
    }

    const counter = verifyTotp(dbUser.totpSecret, parsed.data.code, dbUser.totpLastCode);
    if (counter === null) {
      return NextResponse.json(
        { error: "Неверный код. Проверьте время на устройстве и попробуйте снова." },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { totpEnabled: true, totpLastCode: parsed.data.code },
    });

    // Аудит: факт включения 2FA
    await db.auditLog.create({
      data: {
        userId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "2fa_enabled",
      },
    });

    // Повышаем текущую сессию до 2FA-подтверждённой
    const token = signToken({
      sub: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.fullName, twofa: true,
    });
    await setSessionCookie(token);

    return NextResponse.json({ enabled: true, message: "Двухфакторная аутентификация включена" });
  } catch (e) {
    console.error("2FA enable error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
