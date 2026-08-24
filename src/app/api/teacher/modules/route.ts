import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

const ModuleSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional().nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  coverColor: z.string().default("emerald"),
  estimatedMin: z.number().int().min(5).max(600).default(30),
  categories: z.array(z.string()).default([]), // slugs
  status: z.enum(["draft", "on_moderation"]).default("draft"),
});

// POST /api/teacher/modules — create new module (teacher or admin)
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const { title, description, level, coverColor, estimatedMin, categories, status } = parsed.data;

  const newModule = await db.module.create({
    data: {
      title,
      description: description || null,
      level,
      coverColor,
      estimatedMin,
      status,
      authorId: user.id,
    },
  });

  if (status === "on_moderation") {
    await db.moderationLog.create({
      data: { moduleId: newModule.id, adminId: null, action: "submit", comment: "Отправлено на модерацию преподавателем" },
    });
  }

  // Attach categories
  if (categories.length > 0) {
    const cats = await db.category.findMany({ where: { slug: { in: categories } } });
    await db.moduleCategory.createMany({
      data: cats.map((c) => ({ moduleId: newModule.id, categoryId: c.id })),
    });
  }

  await db.auditLog.create({
    data: { userId: user.id, entityType: "module", entityId: newModule.id, action: "create", newValuesJson: JSON.stringify(parsed.data) },
  });

  return NextResponse.json({ module: newModule });
}

// GET /api/teacher/modules — list teacher's own modules (all statuses)
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: any = { deletedAt: null };
  if (user.role === "teacher") {
    where.authorId = user.id;
  }
  if (status) where.status = status;

  const modules = await db.module.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { lessons: { where: { deletedAt: null } } } },
      moderationLogs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    items: modules.map((m) => ({
      ...m,
      lessonsCount: (m as any)._count?.lessons ?? 0,
      lastModeration: m.moderationLogs?.[0] || null,
    })),
  });
}
