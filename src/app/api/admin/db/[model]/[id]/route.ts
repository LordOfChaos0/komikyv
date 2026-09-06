import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin2FA } from "@/lib/auth";
import {
  getModelMeta, sanitizeRecord, coerceInput, prismaErrorResponse, parseKey, recordKey,
} from "@/lib/admin-db";

// ============================================================
// /api/admin/db/[model]/[id] — запись: чтение (GET),
// изменение (PUT), удаление (DELETE; ?hard=1 — безвозвратное).
// Доступ: только администратор с активной 2FA-сессией.
// Составной ключ передаётся как field1__field2.
// ============================================================

async function guard() {
  const check = await requireAdmin2FA();
  if (!check.ok) {
    const messages: Record<string, string> = {
      UNAUTHORIZED: "Требуется авторизация",
      FORBIDDEN: "Недостаточно прав",
      TWOFA_SETUP_REQUIRED:
        "Для работы с базой данных включите двухфакторную аутентификацию: Настройки → Безопасность",
      TWOFA_REQUIRED: "Требуется вход с подтверждением 2FA. Выйдите и войдите снова.",
    };
    return {
      response: NextResponse.json({ error: messages[check.code], code: check.code }, { status: check.status }),
      admin: null as null | { id: string },
    };
  }
  return { response: null, admin: { id: check.user.id } };
}

type Ctx = { params: Promise<{ model: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { response } = await guard();
  if (response) return response;

  const { model, id } = await params;
  const meta = getModelMeta(model);
  if (!meta) return NextResponse.json({ error: "Неизвестная модель" }, { status: 404 });

  const where = parseKey(meta, id);
  if (!where) return NextResponse.json({ error: "Некорректный ключ записи" }, { status: 400 });

  const record = await (db as any)[meta.key].findFirst({ where });
  if (!record) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

  return NextResponse.json({
    record: { ...sanitizeRecord(meta, record), recordKey: recordKey(meta, record) },
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { response, admin } = await guard();
  if (response) return response;

  const { model, id } = await params;
  const meta = getModelMeta(model);
  if (!meta) return NextResponse.json({ error: "Неизвестная модель" }, { status: 404 });
  if (meta.readOnly) {
    return NextResponse.json(
      { error: "Журналы защищены от изменения — доступен только просмотр" },
      { status: 405 }
    );
  }

  const where = parseKey(meta, id);
  if (!where) return NextResponse.json({ error: "Некорректный ключ записи" }, { status: 400 });

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { data, errors } = coerceInput(meta, payload, { isCreate: false });
  if (errors.length > 0) {
    return NextResponse.json({ error: "Ошибка валидации", details: errors }, { status: 400 });
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для изменения" }, { status: 400 });
  }

  // Защита администратора от собственных действий (как в /api/admin/users)
  if (meta.name === "User" && where.id === admin!.id) {
    if ((data.role && data.role !== "admin") || data.isActive === false) {
      return NextResponse.json(
        { error: "Нельзя понизить свою роль или деактивировать свою учётную запись" },
        { status: 400 }
      );
    }
  }

  try {
    const existing = await (db as any)[meta.key].findFirst({ where });
    if (!existing) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

    // updateMany/deleteMany принимают произвольное where — единая логика
    // для простых и составных первичных ключей
    await (db as any)[meta.key].updateMany({ where, data });
    const updated = await (db as any)[meta.key].findFirst({ where });
    await db.auditLog.create({
      data: {
        userId: admin!.id,
        entityType: meta.name,
        entityId: recordKey(meta, updated),
        action: "db_update",
        oldValuesJson: JSON.stringify(sanitizeRecord(meta, existing)),
        newValuesJson: JSON.stringify(sanitizeRecord(meta, data)),
      },
    });
    return NextResponse.json({
      record: { ...sanitizeRecord(meta, updated), recordKey: recordKey(meta, updated) },
    });
  } catch (e: any) {
    const mapped = prismaErrorResponse(e);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("DB editor update error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { response, admin } = await guard();
  if (response) return response;

  const { model, id } = await params;
  const meta = getModelMeta(model);
  if (!meta) return NextResponse.json({ error: "Неизвестная модель" }, { status: 404 });
  if (meta.readOnly) {
    return NextResponse.json(
      { error: "Журналы защищены от изменения — доступен только просмотр" },
      { status: 405 }
    );
  }

  const where = parseKey(meta, id);
  if (!where) return NextResponse.json({ error: "Некорректный ключ записи" }, { status: 400 });

  const hard = new URL(req.url).searchParams.get("hard") === "1";

  if (meta.name === "User" && where.id === admin!.id) {
    return NextResponse.json(
      { error: "Нельзя удалить свою учётную запись" },
      { status: 400 }
    );
  }

  try {
    const existing = await (db as any)[meta.key].findFirst({ where });
    if (!existing) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

    if (!hard && meta.softDelete) {
      if (existing.deletedAt) {
        return NextResponse.json(
          { error: "Запись уже помечена как удалённая" },
          { status: 400 }
        );
      }
      await (db as any)[meta.key].updateMany({ where, data: { deletedAt: new Date() } });
      await db.auditLog.create({
        data: {
          userId: admin!.id,
          entityType: meta.name,
          entityId: recordKey(meta, existing),
          action: "db_delete",
          oldValuesJson: JSON.stringify(sanitizeRecord(meta, existing)),
        },
      });
      return NextResponse.json({ deleted: true, soft: true });
    }

    // Безвозвратное удаление (hard) или у модели нет deletedAt
    await (db as any)[meta.key].deleteMany({ where });
    await db.auditLog.create({
      data: {
        userId: admin!.id,
        entityType: meta.name,
        entityId: recordKey(meta, existing),
        action: "db_hard_delete",
        oldValuesJson: JSON.stringify(sanitizeRecord(meta, existing)),
      },
    });
    return NextResponse.json({ deleted: true, soft: false });
  } catch (e: any) {
    const mapped = prismaErrorResponse(e);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("DB editor delete error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
