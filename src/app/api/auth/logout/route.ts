import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser, getRequestMeta } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user) {
    const { ip, ua } = getRequestMeta(req as any);
    await db.authLog.create({
      data: { userId: user.id, email: user.email, ipAddress: ip, userAgent: ua, status: "logout" },
    }).catch(() => null);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
