import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, signToken, setSessionCookie, getRequestMeta } from "@/lib/auth";
import { sendVerificationEmail, generateVerificationCode, isSmtpConfigured } from "@/lib/mailer";

const RegisterSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
  fullName: z.string().min(2, "Имя должно быть не менее 2 символов").max(100),
  role: z.enum(["student", "teacher"]).default("student"),
  consent: z.boolean().refine((v) => v === true, "Требуется согласие на обработку данных"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, fullName, role, consent } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const codeExpiresAt = new Date();
    codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 15); // 15 min

    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        fullName,
        role,
        isActive: true,
        pdConsentAt: consent ? new Date() : null,
        emailVerified: false,
        verificationCode,
        codeExpiresAt,
      },
    });

    // Create student profile
    await db.studentProfile.create({
      data: { userId: user.id, level: "beginner", xp: 0 },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationCode, fullName);

    // Welcome notifications
    await db.notification.create({
      data: {
        userId: user.id,
        type: "welcome",
        title: "Добро пожаловать! 🎉",
        message: `Вэллы, ${fullName}! Подтвердите свой email, чтобы получить полный доступ к платформе.`,
        icon: "Sparkles",
        color: "chart-1",
        link: "modules",
      },
    }).catch(() => null);

    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "Совет дня",
        message: "Используйте Cmd+K (или Ctrl+K) для быстрого поиска по платформе.",
        icon: "Lightbulb",
        color: "chart-2",
        link: "vocabulary",
      },
    }).catch(() => null);

    const { ip, ua } = getRequestMeta(req);
    await db.authLog.create({
      data: { userId: user.id, email, ipAddress: ip, userAgent: ua, status: "success" },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.fullName });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      emailVerification: {
        sent: emailResult.sent,
        devCode: emailResult.devCode || null, // shown in dev mode when SMTP not configured
        smtpConfigured: isSmtpConfigured(),
        message: emailResult.sent
          ? `Код подтверждения отправлен на ${email}`
          : "SMTP не настроен — код показан в UI (dev-режим)",
      },
    });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
