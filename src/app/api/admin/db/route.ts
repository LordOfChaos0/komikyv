import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin2FA } from "@/lib/auth";
import { getModelMeta, allModelNames } from "@/lib/admin-db";

// ============================================================
// GET /api/admin/db — реестр моделей для редактора БД.
// Доступ: только администратор с активной 2FA-сессией.
// ============================================================

export async function GET() {
  const check = await requireAdmin2FA();
  if (!check.ok) {
    const messages: Record<string, string> = {
      UNAUTHORIZED: "Требуется авторизация",
      FORBIDDEN: "Недостаточно прав",
      TWOFA_SETUP_REQUIRED:
        "Для работы с базой данных включите двухфакторную аутентификацию: Настройки → Безопасность",
      TWOFA_REQUIRED: "Требуется вход с подтверждением 2FA. Выйдите и войдите снова.",
    };
    return NextResponse.json({ error: messages[check.code], code: check.code }, { status: check.status });
  }

  const models = await Promise.all(
    allModelNames().map(async (name) => {
      const meta = getModelMeta(name)!;
      const count = await (db as any)[meta.key].count(
        meta.softDelete ? { where: { deletedAt: null } } : undefined
      );
      return {
        name: meta.name,
        label: meta.label,
        group: meta.group,
        description: meta.description,
        readOnly: meta.readOnly,
        softDelete: meta.softDelete,
        listColumns: meta.listColumns,
        pkFieldNames: meta.pkFieldNames,
        count,
        fields: meta.fields,
      };
    })
  );

  return NextResponse.json({ models });
}
