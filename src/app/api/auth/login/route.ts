import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie, getRequestMeta } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email } });
    const { ip, ua } = getRequestMeta(req);

    if (!user || user.deletedAt || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      await db.authLog.create({
        data: { userId: user?.id || null, email, ipAddress: ip, userAgent: ua, status: "failed" },
      });
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    await db.authLog.create({
      data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "success" },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.fullName });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
