import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendVerificationEmail, generateVerificationCode, isSmtpConfigured } from "@/lib/mailer";

// POST /api/auth/resend-verification — resend verification code
export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const dbUser = await db.user.findFirst({
    where: { id: user.id, deletedAt: null },
    select: { id: true, email: true, emailVerified: true, fullName: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (dbUser.emailVerified) {
    return NextResponse.json({ alreadyVerified: true, message: "Email уже подтверждён" });
  }

  // Generate new code
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

  // Save code to DB
  await db.user.update({
    where: { id: user.id },
    data: {
      verificationCode: code,
      codeExpiresAt: expiresAt,
    },
  });

  // Try to send email
  const result = await sendVerificationEmail(dbUser.email, code, dbUser.fullName);

  if (result.sent) {
    return NextResponse.json({
      sent: true,
      message: `Код подтверждения отправлен на ${dbUser.email}`,
    });
  }

  // SMTP not configured or failed — return dev code
  return NextResponse.json({
    sent: false,
    message: "SMTP не настроен. Используйте код ниже для подтверждения (dev-режим).",
    devCode: result.devCode,
    error: result.error,
    smtpConfigured: isSmtpConfigured(),
  });
}
