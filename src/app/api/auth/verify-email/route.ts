import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const VerifySchema = z.object({
  code: z.string().length(6, "Код должен содержать 6 цифр"),
});

// POST /api/auth/verify-email — verify the email with the 6-digit code
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный код" }, { status: 400 });
  }
  const { code } = parsed.data;

  const dbUser = await db.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      verificationCode: true,
      codeExpiresAt: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (dbUser.emailVerified) {
    return NextResponse.json({ alreadyVerified: true, message: "Email уже подтверждён" });
  }

  if (!dbUser.verificationCode || !dbUser.codeExpiresAt) {
    return NextResponse.json({ error: "Код не был отправлен. Запросите новый." }, { status: 400 });
  }

  // Check expiry
  if (new Date() > dbUser.codeExpiresAt) {
    return NextResponse.json({ error: "Код истёк. Запросите новый." }, { status: 400 });
  }

  // Check code
  if (dbUser.verificationCode !== code) {
    return NextResponse.json({ error: "Неверный код подтверждения" }, { status: 400 });
  }

  // Success — mark email as verified
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationCode: null,
      codeExpiresAt: null,
    },
  });

  // Create welcome notification (if not already)
  const existingWelcomes = await db.notification.count({
    where: { userId: user.id, type: "welcome" },
  });
  if (existingWelcomes === 0) {
    await db.notification.create({
      data: {
        userId: user.id,
        type: "welcome",
        title: "Добро пожаловать! 🎉",
        message: `Вэллы! Ваш email подтверждён. Начните обучение с раздела «Учебные модули».`,
        icon: "Sparkles",
        color: "chart-1",
        link: "modules",
      },
    }).catch(() => null);
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "email_verified",
    },
  }).catch(() => null);

  return NextResponse.json({ verified: true, message: "Email успешно подтверждён!" });
}

// GET /api/auth/verify-email — check if current user's email is verified
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const dbUser = await db.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: {
      email: true,
      emailVerified: true,
      verificationCode: true,
      codeExpiresAt: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({
    email: dbUser.email,
    emailVerified: dbUser.emailVerified,
    hasPendingCode: !!dbUser.verificationCode && !!dbUser.codeExpiresAt && new Date() < dbUser.codeExpiresAt,
  });
}
