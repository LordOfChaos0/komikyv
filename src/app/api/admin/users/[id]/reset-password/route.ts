import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

// ============================================================
// POST /api/admin/users/[id]/reset-password (REC 4.2)
// Ручной сброс пароля администратором: генерирует новый случайный
// пароль, сохраняет хэш и возвращает пароль один раз для передачи
// пользователю. Факт фиксируется в AuditLog.
// ============================================================

function generateRandomPassword(): string {
  // 12 символов: гарантированные буквы обоих регистров + цифры + спецсимвол
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%*";
  const all = upper + lower + digits + special;
  const pick = (set: string) =>
    set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  let pwd =
    pick(upper) + pick(lower) + pick(digits) + pick(special);
  const bytes = crypto.getRandomValues(new Uint32Array(8));
  for (let i = 0; i < 8; i++) pwd += all[bytes[i] % all.length];
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { id } = await params;

  const user = await db.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const newPassword = generateRandomPassword();
  await db.user.update({
    where: { id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  // Аудит: кто и кому сбросил пароль (сам пароль не логируем)
  await db.auditLog.create({
    data: {
      userId: admin.id,
      entityType: "user",
      entityId: id,
      action: "password_reset",
      newValuesJson: JSON.stringify({ targetEmail: user.email, at: new Date().toISOString() }),
    },
  });

  return NextResponse.json({
    message: "Новый пароль сгенерирован. Передайте его пользователю — он показывается только один раз.",
    password: newPassword,
    email: user.email,
  });
}
