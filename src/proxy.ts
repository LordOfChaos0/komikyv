import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Proxy (Next.js 16, ранее — middleware)
// Центральная точка безопасности для всех /api/* запросов:
//   1. CORS: preflight OPTIONS + echo разрешённых origin
//   2. Rate limiting: защита auth-эндпоинтов от брутфорса
//   3. CSRF: double-submit cookie (X-CSRF-Token === komi_csrf)
//   4. Админ-токен: X-Admin-Token для /api/admin/* (опционально)
//   5. Выдача CSRF-cookie при первом запросе
// ============================================================

const CSRF_COOKIE = "komi_csrf";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// --- Rate limits: путь → {лимит запросов, окно в мс} ---
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/login": { limit: 5, windowMs: 60_000 },
  "/api/auth/register": { limit: 3, windowMs: 60_000 },
  "/api/auth/forgot-password": { limit: 3, windowMs: 60_000 },
  "/api/auth/reset-password": { limit: 5, windowMs: 60_000 },
  "/api/auth/resend-verification": { limit: 3, windowMs: 60_000 },
  "/api/auth/2fa/enable": { limit: 5, windowMs: 60_000 },
  "/api/auth/2fa/disable": { limit: 5, windowMs: 60_000 },
};

// In-memory sliding window (достаточно для single-instance деплоя;
// для кластера заменить на Redis)
const hits = new Map<string, number[]>();

function isRateLimited(key: string, limit: number, windowMs: number): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - arr[0])) / 1000);
    hits.set(key, arr);
    return { limited: true, retryAfter: Math.max(1, retryAfter) };
  }
  arr.push(now);
  hits.set(key, arr);
  // чистка map при разрастании
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return { limited: false, retryAfter: 0 };
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  const allowed = getAllowedOrigins();
  if (!allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonError(message: string, status: number, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: extra });
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const method = req.method.toUpperCase();

  // ---------------------------------------------------------
  // 1. CORS preflight (OPTIONS) для API
  // ---------------------------------------------------------
  if (isApi && method === "OPTIONS") {
    const origin = req.headers.get("origin");
    const headers = corsHeaders(origin);
    // Даже если origin не разрешён — отвечаем 204 без CORS-заголовков,
    // браузер сам заблокирует фактический запрос.
    return new NextResponse(null, { status: 204, headers });
  }

  if (!isApi) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 2. Rate limiting для чувствительных эндпоинтов
  // ---------------------------------------------------------
  const rl = RATE_LIMITS[pathname];
  if (rl) {
    const ip = getClientIp(req);
    const { limited, retryAfter } = isRateLimited(`${ip}:${pathname}`, rl.limit, rl.windowMs);
    if (limited) {
      return jsonError(
        `Слишком много запросов. Повторите через ${retryAfter} с.`,
        429,
        { "Retry-After": String(retryAfter) }
      );
    }
  }

  // ---------------------------------------------------------
  // 3. CSRF: double-submit cookie для мутирующих запросов
  // ---------------------------------------------------------
  if (MUTATING.has(method)) {
    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
    const headerToken = req.headers.get("x-csrf-token");
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return jsonError(
        "CSRF-токен отсутствует или недействителен. Обновите страницу и повторите.",
        403
      );
    }
  }

  // ---------------------------------------------------------
  // 4. Админ-токен (REC 4.1): если ADMIN_ACCESS_TOKEN задан,
  //    все /api/admin/* требуют заголовок X-Admin-Token
  // ---------------------------------------------------------
  if (pathname.startsWith("/api/admin/") && process.env.ADMIN_ACCESS_TOKEN) {
    const token = req.headers.get("x-admin-token");
    if (token !== process.env.ADMIN_ACCESS_TOKEN) {
      return jsonError(
        "Требуется токен доступа администратора",
        403,
        { "x-admin-token-required": "true" }
      );
    }
  }

  // ---------------------------------------------------------
  // 5. Пропускаем запрос + выдаём CSRF-cookie
  // ---------------------------------------------------------
  const res = NextResponse.next();

  // CORS-заголовки для разрешённых origin
  const origin = req.headers.get("origin");
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    res.headers.set(k, v);
  }

  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, crypto.randomUUID(), {
      httpOnly: false, // должен читаться JS для X-CSRF-Token
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
