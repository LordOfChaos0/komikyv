import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin2FA, hashPassword } from "@/lib/auth";
import {
  getModelMeta, sanitizeRecord, coerceInput, buildSearchWhere,
  prismaErrorResponse, recordKey,
} from "@/lib/admin-db";

// ============================================================
// /api/admin/db/[model] — список записей (GET) и создание (POST)
// Доступ: только администратор с активной 2FA-сессией.
// ============================================================

function randomPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%*";
  const all = upper + lower + digits + special;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(special);
  const bytes = crypto.getRandomValues(new Uint32Array(8));
  for (let i = 0; i < 8; i++) pwd += all[bytes[i] % all.length];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  const { response } = await guard();
  if (response) return response;

  const { model } = await params;
  const meta = getModelMeta(model);
  if (!meta) return NextResponse.json({ error: "Неизвестная модель" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20));
  const deleted = searchParams.get("deleted") || "hide"; // hide | only | all

  // Сортировка: только по скалярным полям модели
  const sortParam = searchParams.get("sort") || "";
  const dirParam = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const sortField = meta.fields.find((f) => f.name === sortParam && !f.isSensitive);
  const orderBy: any = sortField
    ? { [sortField.name]: dirParam }
    : meta.fields.some((f) => f.name === "createdAt")
      ? { createdAt: "desc" }
      : { [meta.pkFieldNames[0]]: "desc" };

  // Фильтр мягкого удаления
  const where: any = {};
  if (meta.softDelete && deleted === "hide") where.deletedAt = null;
  if (meta.softDelete && deleted === "only") where.deletedAt = { not: null };
  if (q) Object.assign(where, buildSearchWhere(meta, q));

  // Выбираем только скалярные поля (без связей)
  const select: any = {};
  for (const f of meta.fields) select[f.name] = true;

  const delegate = (db as any)[meta.key];
  const [total, items] = await Promise.all([
    delegate.count({ where }),
    delegate.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select }),
  ]);

  return NextResponse.json({
    items: items.map((r: any) => ({ ...sanitizeRecord(meta, r), recordKey: recordKey(meta, r) })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  const { response, admin } = await guard();
  if (response) return response;

  const { model } = await params;
  const meta = getModelMeta(model);
  if (!meta) return NextResponse.json({ error: "Неизвестная модель" }, { status: 404 });
  if (meta.readOnly) {
    return NextResponse.json(
      { error: "Журналы защищены от изменения — доступен только просмотр" },
      { status: 405 }
    );
  }

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  // Спец-обработка User: пароль задаётся открытым текстом или генерируется
  let generatedPassword: string | null = null;
  const input = { ...payload };
  if (meta.name === "User") {
    if (typeof input.password === "string" && input.password.length >= 8) {
      input.passwordHash = "SET_BY_ROUTE"; // маркер: заменим ниже
    } else {
      generatedPassword = randomPassword();
      input.passwordHash = "SET_BY_ROUTE";
    }
    delete input.password;
  }

  const { data, errors } = coerceInput(meta, input, { isCreate: true });
  if (errors.length > 0) {
    return NextResponse.json({ error: "Ошибка валидации", details: errors }, { status: 400 });
  }
  if (meta.name === "User") {
    (data as any).passwordHash = hashPassword(
      typeof payload.password === "string" && payload.password.length >= 8 ? payload.password : generatedPassword!
    );
  }

  try {
    const created = await (db as any)[meta.key].create({ data });
    await db.auditLog.create({
      data: {
        userId: admin!.id,
        entityType: meta.name,
        entityId: meta.pkFieldNames.map((n) => (created as any)[n]).join("__"),
        action: "db_create",
        newValuesJson: JSON.stringify(sanitizeRecord(meta, data)),
      },
    });
    return NextResponse.json({
      record: { ...sanitizeRecord(meta, created), recordKey: recordKey(meta, created) },
      generatedPassword,
    });
  } catch (e: any) {
    const mapped = prismaErrorResponse(e);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("DB editor create error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
