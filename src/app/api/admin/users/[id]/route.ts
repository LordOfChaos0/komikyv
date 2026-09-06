import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, getRequestMeta } from "@/lib/auth";

// ============================================================
// DELETE /api/admin/users/[id] — удаление профиля администратором
// (REC 4.2: блокировка / редактирование / сброс пароля / удаление)
//
// Та же модель, что при самоудалении: soft delete + анонимизация
// ПД. Дополнительно:
//   - админ не может удалить собственный аккаунт (только через
//     настройки — иначе рискует остаться без входа в панель);
//   - нельзя удалить последнего активного администратора.
// Факт фиксируется в AuditLog с причиной удаления.
// ============================================================

const DeleteSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Только администратор
    let admin;
    try {
      admin = await requireRole("admin");
    } catch {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = DeleteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 2. Целевой пользователь должен существовать и быть живым
    const target = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) {
      return NextResponse.json(
        { error: "Пользователь не найден или уже удалён" },
        { status: 404 }
      );
    }

    // 3. Защита от самоудаления из админ-панели
    if (target.id === admin.id) {
      return NextResponse.json(
        { error: "Нельзя удалить собственный аккаунт из админ-панели. Используйте «Настройки → Удаление аккаунта»." },
        { status: 400 }
      );
    }

    // 4. Нельзя удалить последнего активного администратора
    if (target.role === "admin") {
      const activeAdmins = await db.user.count({
        where: { role: "admin", deletedAt: null, isActive: true },
      });
      if (activeAdmins <= 1) {
        return NextResponse.json(
          { error: "Нельзя удалить последнего активного администратора системы" },
          { status: 400 }
        );
      }
    }

    // 5. Анонимизация + soft delete (единая транзакция)
    const deletedAt = new Date();
    await db.$transaction([
      db.user.update({
        where: { id: target.id },
        data: {
          deletedAt,
          isActive: false,
          email: `deleted-${target.id}@removed.komikyv.local`,
          fullName: null,
          passwordHash: `removed$${target.id}$${deletedAt.getTime()}`,
          verificationCode: null,
          codeExpiresAt: null,
          totpSecret: null,
          totpEnabled: false,
          totpLastCode: null,
          pdConsentAt: null,
        },
      }),
      db.notification.deleteMany({ where: { userId: target.id } }),
      db.favorite.updateMany({
        where: { userId: target.id },
        data: { note: null },
      }),
    ]);

    // 6. Аудит с причиной
    await db.auditLog.create({
      data: {
        userId: admin.id,
        entityType: "user",
        entityId: target.id,
        action: "delete",
        oldValuesJson: JSON.stringify({
          email: target.email,
          fullName: target.fullName,
          role: target.role,
          isActive: target.isActive,
        }),
        newValuesJson: JSON.stringify({
          deletedAt: deletedAt.toISOString(),
          anonymized: true,
          reason: parsed.data.reason || null,
        }),
      },
    });

    const { ip } = getRequestMeta(req);
    void ip;

    return NextResponse.json({
      ok: true,
      message: `Пользователь ${target.email} удалён, данные анонимизированы`,
    });
  } catch (e) {
    console.error("Admin delete user error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
