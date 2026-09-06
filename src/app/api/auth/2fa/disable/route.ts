import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, signToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

// ============================================================
// POST /api/auth/2fa/disable — отключение 2FA
// Требует код из приложения-аутентификатора ИЛИ текущий пароль
// (чтобы злоумышленник с угнанной сессией не смог ослабить
// защиту). Текущая сессия переиздаётся без флага twofa.
// ============================================================

const DisableSchema = z.object({
  code: z.string().length(6).optional(),
  password: z.string().min(1).optional(),
}).refine((v) => v.code || v.password, {
  message: "Укажите код аутентификатора или текущий пароль",
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

    const body = await req.json();
    const parsed = DisableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Укажите код аутентификатора или текущий пароль" },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findFirst({ where: { id: user.id, deletedAt: null } });
    if (!dbUser) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    if (!dbUser.totpEnabled) {
      return NextResponse.json({ error: "Двухфакторная аутентификация не включена" }, { status: 400 });
    }

    // Подтверждение: код TOTP или пароль
    let confirmed = false;
    if (parsed.data.code) {
      confirmed = !!dbUser.totpSecret && verifyTotp(dbUser.totpSecret, parsed.data.code, dbUser.totpLastCode) !== null;
    } else if (parsed.data.password) {
      confirmed = verifyPassword(parsed.data.password, dbUser.passwordHash);
    }
    if (!confirmed) {
      return NextResponse.json(
        { error: "Подтверждение не пройдено: неверный код или пароль" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null, totpLastCode: null },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        entityType: "user",
        entityId: user.id,
        action: "2fa_disabled",
      },
    });

    // Переиздаём сессию без 2FA-флага
    const token = signToken({
      sub: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.fullName,
    });
    await setSessionCookie(token);

    return NextResponse.json({ enabled: false, message: "Двухфакторная аутентификация отключена" });
  } catch (e) {
    console.error("2FA disable error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
