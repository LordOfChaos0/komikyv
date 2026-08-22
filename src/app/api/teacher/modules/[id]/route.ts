import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";

const UpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  coverColor: z.string().optional(),
  estimatedMin: z.number().int().min(5).max(600).optional(),
  categories: z.array(z.string()).optional(),
  status: z.enum(["draft", "on_moderation", "published", "rejected", "archived"]).optional(),
});

// PUT /api/teacher/modules/[id] — update module (teacher owner or admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { id } = await params;
  const mod = await db.module.findFirst({ where: { id, deletedAt: null } });
  if (!mod) {
    return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  }
  if (user.role === "teacher" && mod.authorId !== user.id) {
    return NextResponse.json({ error: "Нет доступа к этому модулю" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const { categories, status, ...rest } = parsed.data;

  const updated = await db.module.update({
    where: { id },
    data: rest as any,
  });

  if (status === "on_moderation" && mod.status !== "on_moderation") {
    await db.moderationLog.create({
      data: { moduleId: id, adminId: null, action: "submit" },
    });
  }

  if (categories) {
    await db.moduleCategory.deleteMany({ where: { moduleId: id } });
    if (categories.length > 0) {
      const cats = await db.category.findMany({ where: { slug: { in: categories } } });
      await db.moduleCategory.createMany({
        data: cats.map((c) => ({ moduleId: id, categoryId: c.id })),
        skipDuplicates: true,
      });
    }
  }

  await db.auditLog.create({
    data: { userId: user.id, entityType: "module", entityId: id, action: "update", newValuesJson: JSON.stringify(parsed.data) },
  });

  return NextResponse.json({ module: updated });
}

// DELETE /api/teacher/modules/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole("teacher", "admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { id } = await params;
  const mod = await db.module.findFirst({ where: { id, deletedAt: null } });
  if (!mod) return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });
  if (user.role === "teacher" && mod.authorId !== user.id) {
    return NextResponse.json({ error: "Нет доступа к этому модулю" }, { status: 403 });
  }
  await db.module.update({ where: { id }, data: { deletedAt: new Date(), status: "archived" } });
  await db.auditLog.create({
    data: { userId: user.id, entityType: "module", entityId: id, action: "delete" },
  });
  return NextResponse.json({ ok: true });
}
