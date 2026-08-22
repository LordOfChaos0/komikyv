import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const ModerationSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes", "publish", "archive"]),
  comment: z.string().max(1000).optional(),
});

// GET /api/admin/moderation — list modules awaiting moderation
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "on_moderation";

  const modules = await db.module.findMany({
    where: { status, deletedAt: null },
    orderBy: { updatedAt: "asc" },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
      _count: { select: { lessons: { where: { deletedAt: null } } } },
      moderationLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { admin: { select: { fullName: true, email: true } } },
      },
    },
  });

  return NextResponse.json({
    items: modules.map((m) => ({
      ...m,
      lessonsCount: (m as any)._count?.lessons ?? 0,
    })),
  });
}

// POST /api/admin/moderation — moderate a module by id
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = ModerationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  const moduleId = body.moduleId as string;
  if (!moduleId) {
    return NextResponse.json({ error: "moduleId обязателен" }, { status: 400 });
  }

  const mod = await db.module.findFirst({ where: { id: moduleId, deletedAt: null } });
  if (!mod) return NextResponse.json({ error: "Модуль не найден" }, { status: 404 });

  const { action, comment } = parsed.data;
  let newStatus = mod.status;
  let publishedAt = mod.publishedAt;

  if (action === "approve") {
    newStatus = "published";
    publishedAt = new Date();
  } else if (action === "publish") {
    newStatus = "published";
    publishedAt = new Date();
  } else if (action === "reject") {
    newStatus = "rejected";
  } else if (action === "request_changes") {
    newStatus = "draft";
  } else if (action === "archive") {
    newStatus = "archived";
  }

  await db.module.update({
    where: { id: moduleId },
    data: {
      status: newStatus,
      publishedAt,
      rejectionComment: action === "reject" || action === "request_changes" ? (comment || null) : null,
    },
  });

  await db.moderationLog.create({
    data: { moduleId, adminId: user.id, action, comment: comment || null },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      entityType: "module",
      entityId: moduleId,
      action: `moderate:${action}`,
      newValuesJson: JSON.stringify({ status: newStatus, comment }),
    },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
