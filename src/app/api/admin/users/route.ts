import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const UpdateUserSchema = z.object({
  role: z.enum(["student", "teacher", "admin"]).optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().max(200).optional(),
});

// GET /api/admin/users — list users with filter/search
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const role = searchParams.get("role") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

  const where: any = { deletedAt: null };
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { fullName: { contains: q } },
    ];
  }
  if (role) where.role = role;

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        studentProfile: { select: { xp: true, level: true, currentStreak: true } },
        _count: {
          select: {
            lessonProgress: true,
            dialogSessions: true,
            authoredModules: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      profile: u.studentProfile,
      stats: {
        lessonsCompleted: (u as any)._count.lessonProgress,
        dialogSessions: (u as any)._count.dialogSessions,
        authoredModules: (u as any)._count.authoredModules,
      },
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// PUT /api/admin/users/[id] — update role/active (handled by id in body for simplicity)
export async function PUT(req: NextRequest) {
  let user;
  try {
    user = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  const parsed = UpdateUserSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }
  if (id === user.id && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "Нельзя понизить свою роль" }, { status: 400 });
  }
  const updated = await db.user.update({
    where: { id },
    data: parsed.data as any,
  });
  await db.auditLog.create({
    data: {
      userId: user.id,
      entityType: "user",
      entityId: id,
      action: "update",
      newValuesJson: JSON.stringify(parsed.data),
    },
  });
  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive,
    },
  });
}
