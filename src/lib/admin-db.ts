import { Prisma } from "@prisma/client";

// ============================================================
// Редактор БД для админ-панели (2FA-protected)
// Метаданные моделей берутся из Prisma DMMF — реестр ниже
// задаёт подписи, группировку и правила безопасности.
// ============================================================

const DMMF_MODELS: any[] = (Prisma as any).dmmf.datamodel.models;

export interface DbFieldMeta {
  name: string;
  type: string; // String | Boolean | Int | Float | DateTime
  isId: boolean;
  isRequired: boolean;
  hasDefault: boolean;
  isUpdatedAt: boolean;
  isSensitive: boolean; // маскируется при выводе, игнорируется при вводе
  isJson: boolean; // String-поле с суффиксом Json — редактируется как JSON
  relationTo?: string; // целевая модель для FK-скаляров
}

export interface DbModelMeta {
  name: string; // имя модели Prisma (например, SrsReview)
  key: string; // имя делегата клиента (например, srsReview)
  label: string;
  group: string;
  description: string;
  readOnly: boolean;
  softDelete: boolean;
  fields: DbFieldMeta[];
  listColumns: string[];
  pkFieldNames: string[]; // простой PK — на уровне поля, составной — из primaryKey модели
}

// --- Конфигурация: подписи, группы, колонки списка, защита ---

interface ModelConfig {
  label: string;
  group: string;
  description?: string;
  readOnly?: boolean;
  listColumns?: string[];
}

const MODEL_CONFIG: Record<string, ModelConfig> = {
  User: {
    label: "Пользователи",
    group: "Пользователи и доступ",
    description: "Учётные записи, роли, статус, 2FA",
    listColumns: ["email", "fullName", "role", "isActive", "totpEnabled"],
  },
  StudentProfile: {
    label: "Профили учеников",
    group: "Пользователи и доступ",
    description: "Уровень, опыт, серии дней, настройки",
    listColumns: ["userId", "level", "xp", "currentStreak"],
  },
  Category: {
    label: "Категории",
    group: "Учебный контент",
    description: "Тематические категории модулей",
    listColumns: ["name", "slug", "color"],
  },
  Module: {
    label: "Модули",
    group: "Учебный контент",
    description: "Учебные модули и статусы модерации",
    listColumns: ["title", "level", "status", "authorId"],
  },
  ModuleCategory: {
    label: "Связи модуль–категория",
    group: "Учебный контент",
    description: "M:N-связи модулей и категорий",
    listColumns: ["moduleId", "categoryId"],
  },
  Lesson: {
    label: "Уроки",
    group: "Учебный контент",
    description: "Уроки внутри модулей, теория, проходной балл",
    listColumns: ["moduleId", "title", "orderIndex"],
  },
  Exercise: {
    label: "Упражнения",
    group: "Учебный контент",
    description: "Шесть типов упражнений уроков",
    listColumns: ["lessonId", "type", "question"],
  },
  Vocabulary: {
    label: "Словарь",
    group: "Учебный контент",
    description: "Коми-слова с переводом и транскрипцией",
    listColumns: ["lessonId", "wordKomi", "translationRu"],
  },
  DialogScenario: {
    label: "Сценарии диалогов",
    group: "Учебный контент",
    description: "Сценарии LLM-тренажёра разговорной практики",
    listColumns: ["title", "level"],
  },
  LessonProgress: {
    label: "Прогресс уроков",
    group: "Обучение и прогресс",
    description: "Попытки и результаты прохождения уроков",
    listColumns: ["userId", "lessonId", "score", "isCompleted"],
  },
  SrsReview: {
    label: "Интервальные повторения",
    group: "Обучение и прогресс",
    description: "Расписание SM-2 по словам ученика",
    listColumns: ["userId", "vocabularyId", "interval", "nextReviewAt"],
  },
  Favorite: {
    label: "Избранное",
    group: "Обучение и прогресс",
    description: "Сохранённые слова с заметками",
    listColumns: ["userId", "vocabularyId", "note"],
  },
  DialogSession: {
    label: "Сессии диалогов",
    group: "Обучение и прогресс",
    description: "История диалогов с LLM и оценки",
    listColumns: ["userId", "scenarioId", "status"],
  },
  Achievement: {
    label: "Достижения",
    group: "Обучение и прогресс",
    description: "Каталог достижений и награды XP",
    listColumns: ["code", "title", "xpReward"],
  },
  UserAchievement: {
    label: "Достижения пользователей",
    group: "Обучение и прогресс",
    description: "Связи M:N пользователь–достижение",
    listColumns: ["userId", "achievementId", "receivedAt"],
  },
  Notification: {
    label: "Уведомления",
    group: "Уведомления и медиа",
    description: "Уведомления пользователей",
    listColumns: ["userId", "type", "title", "isRead"],
  },
  MediaFile: {
    label: "Медиафайлы",
    group: "Уведомления и медиа",
    description: "Реестр загруженных файлов",
    listColumns: ["ownerId", "fileType", "storagePath"],
  },
  ModerationLog: {
    label: "Журнал модерации",
    group: "Журналы (только чтение)",
    description: "Действия администраторов по модулям. Изменение запрещено — целостность аудита",
    readOnly: true,
    listColumns: ["moduleId", "adminId", "action"],
  },
  AuthLog: {
    label: "Журнал аутентификации",
    group: "Журналы (только чтение)",
    description: "Входы, отказы и 2FA-события. Хранение 12 мес — изменение запрещено",
    readOnly: true,
    listColumns: ["email", "status", "ipAddress"],
  },
  AuditLog: {
    label: "Журнал аудита",
    group: "Журналы (только чтение)",
    description: "Все операции редактора БД фиксируются здесь. Хранение 12 мес — изменение запрещено",
    readOnly: true,
    listColumns: ["userId", "entityType", "action", "entityId"],
  },
};

// Поля, маскируемые при выводе и игнорируемые при вводе
const SENSITIVE: Record<string, string[]> = {
  User: ["passwordHash", "totpSecret", "totpLastCode", "verificationCode"],
};

const MASK = "***";

// --- Построение метаданных модели из DMMF ---

function lcfirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

const metaCache = new Map<string, DbModelMeta | null>();

export function getModelMeta(name: string): DbModelMeta | null {
  if (metaCache.has(name)) return metaCache.get(name)!;
  let meta: DbModelMeta | null = null;
  const dmmfModel = DMMF_MODELS.find((m) => m.name === name);
  const config = MODEL_CONFIG[name];
  if (dmmfModel && config) {
    // FK-скаляр -> целевая модель (через relationFromFields объектных полей)
    const fkMap = new Map<string, string>();
    for (const f of dmmfModel.fields) {
      if (f.kind === "object" && Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0) {
        fkMap.set(f.relationFromFields[0], f.type);
      }
    }
    const sensitive = new Set(SENSITIVE[name] || []);
    const fields: DbFieldMeta[] = dmmfModel.fields
      .filter((f: any) => f.kind === "scalar")
      .map((f: any) => ({
        name: f.name,
        type: f.type,
        isId: !!f.isId,
        isRequired: !!f.isRequired,
        hasDefault: !!f.hasDefaultValue,
        isUpdatedAt: !!f.isUpdatedAt,
        isSensitive: sensitive.has(f.name),
        isJson: f.type === "String" && f.name.endsWith("Json"),
        relationTo: fkMap.get(f.name),
      }));
    const hasDeletedAt = fields.some((f) => f.name === "deletedAt");
    // Простой PK — поле с isId; составной — из dmmfModel.primaryKey.fields
    const pkFieldNames: string[] = Array.isArray(dmmfModel.primaryKey?.fields) && dmmfModel.primaryKey.fields.length > 0
      ? dmmfModel.primaryKey.fields
      : fields.filter((f) => f.isId).map((f) => f.name);
    meta = {
      name,
      key: lcfirst(name),
      label: config.label,
      group: config.group,
      description: config.description || "",
      readOnly: !!config.readOnly,
      softDelete: hasDeletedAt,
      fields,
      listColumns: config.listColumns || ["id"],
      pkFieldNames,
    };
  }
  metaCache.set(name, meta);
  return meta;
}

export function allModelNames(): string[] {
  return Object.keys(MODEL_CONFIG);
}

// --- Санитизация вывода ---

export function sanitizeRecord(meta: DbModelMeta, record: any): any {
  if (!record) return record;
  const out = { ...record };
  for (const f of meta.fields) {
    if (f.isSensitive && out[f.name] != null) out[f.name] = MASK;
  }
  return out;
}

// --- Коэрсинг и валидация ввода ---

export function coerceInput(
  meta: DbModelMeta,
  payload: Record<string, any>,
  opts: { isCreate: boolean }
): { data: Record<string, any>; errors: string[] } {
  const errors: string[] = [];
  const data: Record<string, any> = {};
  const allowed = new Map(meta.fields.map((f) => [f.name, f]));

  for (const [key, raw] of Object.entries(payload || {})) {
    const f = allowed.get(key);
    // Служебные и защищённые поля не редактируются через редактор БД
    if (!f || f.isSensitive) continue;
    if (key === "id" && opts.isCreate) continue;
    if (f.isUpdatedAt) continue;

    // null / пустая строка
    const isEmpty = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
    if (isEmpty) {
      if (opts.isCreate && f.hasDefault) {
        // пропускаем — Prisma применит значение по умолчанию
      } else if (f.isRequired) {
        errors.push(`Поле «${key}» обязательно для заполнения`);
      } else {
        data[key] = null;
      }
      continue;
    }

    switch (f.type) {
      case "String": {
        const s = String(raw);
        if (f.isJson && typeof raw !== "string") {
          data[key] = JSON.stringify(raw);
        } else {
          data[key] = s;
        }
        break;
      }
      case "Int": {
        const n = Number(raw);
        if (!Number.isInteger(n)) errors.push(`Поле «${key}» должно быть целым числом`);
        else data[key] = n;
        break;
      }
      case "Float": {
        const n = Number(raw);
        if (Number.isNaN(n)) errors.push(`Поле «${key}» должно быть числом`);
        else data[key] = n;
        break;
      }
      case "Boolean": {
        if (typeof raw === "boolean") data[key] = raw;
        else if (raw === "true") data[key] = true;
        else if (raw === "false") data[key] = false;
        else errors.push(`Поле «${key}» должно быть логическим (да/нет)`);
        break;
      }
      case "DateTime": {
        const d = new Date(String(raw));
        if (isNaN(d.getTime())) errors.push(`Поле «${key}»: некорректная дата`);
        else data[key] = d;
        break;
      }
      default:
        data[key] = raw;
    }
  }

  // JSON-строки: проверка синтаксиса
  for (const f of meta.fields) {
    if (f.isJson && typeof data[f.name] === "string") {
      try {
        JSON.parse(data[f.name] as string);
      } catch {
        errors.push(`Поле «${f.name}» содержит некорректный JSON`);
      }
    }
  }

  // При создании все обязательные поля без значения по умолчанию должны быть заданы
  // (updatedAt и isId с дефолтом Prisma проставляет автоматически)
  if (opts.isCreate) {
    for (const f of meta.fields) {
      if (f.isRequired && !f.hasDefault && !f.isSensitive && !f.isUpdatedAt && !(f.name in data)) {
        errors.push(`Поле «${f.name}» обязательно для заполнения`);
      }
    }
  }

  return { data, errors };
}

// --- Ключ записи (составные PK кодируются через __) ---

export function pkFields(meta: DbModelMeta): DbFieldMeta[] {
  return meta.pkFieldNames
    .map((n) => meta.fields.find((f) => f.name === n))
    .filter(Boolean) as DbFieldMeta[];
}

export function recordKey(meta: DbModelMeta, record: any): string {
  return pkFields(meta).map((f) => String(record?.[f.name] ?? "")).join("__");
}

/** Разбор ключа из URL в where-условие. null — некорректный ключ. */
export function parseKey(meta: DbModelMeta, key: string): Record<string, any> | null {
  const pks = pkFields(meta);
  if (pks.length === 1) return { [pks[0].name]: key };
  const parts = key.split("__");
  if (parts.length !== pks.length || parts.some((p) => p === "")) return null;
  const where: Record<string, any> = {};
  pks.forEach((f, i) => {
    where[f.name] = parts[i];
  });
  return where;
}

// --- Поиск по строковым полям ---

export function buildSearchWhere(meta: DbModelMeta, q: string): any {
  const stringFields = meta.fields
    .filter((f) => f.type === "String" && !f.isSensitive)
    .slice(0, 6)
    .map((f) => ({ [f.name]: { contains: q } }));
  if (stringFields.length === 0) return {};
  return { OR: stringFields };
}

// --- Маппинг ошибок Prisma в HTTP-ответы ---

export function prismaErrorResponse(e: any): { status: number; body: any } | null {
  const code = e?.code;
  if (!code) return null;
  switch (code) {
    case "P2002":
      return {
        status: 409,
        body: { error: `Нарушение уникальности: ${e?.meta?.target || "поле"} уже существует` },
      };
    case "P2025":
      return { status: 404, body: { error: "Запись не найдена" } };
    case "P2003":
      return {
        status: 409,
        body: { error: "Нарушение ссылочной целостности: связанная запись не существует" },
      };
    default:
      return { status: 400, body: { error: `Ошибка базы данных (${code})`, details: String(e?.message || "").slice(0, 300) } };
  }
}
