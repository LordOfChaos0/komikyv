import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";

// ============================================================
// POST /api/auth/2fa/setup — подготовка включения 2FA
// Генерирует секрет TOTP (пока не активирован) и возвращает
// otpauth-ссылку + QR-код для приложения-аутентификатора.
// ============================================================

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const dbUser = await db.user.findFirst({ where: { id: user.id, deletedAt: null } });
  if (!dbUser) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (dbUser.totpEnabled) {
    return NextResponse.json({ error: "Двухфакторная аутентификация уже включена" }, { status: 400 });
  }

  // Новый секрет (перезаписывает предыдущий неподтверждённый)
  const secret = generateTotpSecret();
  await db.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpLastCode: null } });

  const url = otpauthUrl(secret, dbUser.email);

  // QR-код в SVG (пакет qrcode; при недоступности — ручной ввод секрета)
  let qrSvg: string | null = null;
  try {
    const QRCode = (await import("qrcode")).default;
    qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 220, color: { dark: "#1a1a1a", light: "#ffffff" } });
  } catch (e) {
    console.warn("[2fa] QR-генерация недоступна, показываем секрет текстом:", (e as Error).message);
  }

  return NextResponse.json({
    secret,
    otpauthUrl: url,
    qrSvg,
    message: "Отсканируйте QR-код приложением-аутентификатором и подтвердите код",
  });
}
