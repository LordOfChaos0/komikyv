import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

// ============================================================
// Password hashing (scrypt — Node built-in, no extra deps)
// ============================================================

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const hash = parts[2];
  const testHash = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  if (testHash.length !== storedBuf.length) return false;
  return timingSafeEqual(testHash, storedBuf);
}

// ============================================================
// Stateless JWT (HMAC-SHA256) — no external deps
// ============================================================

// JWT-секрет: в production обязательно переопределяется через env-переменную.
// При отсутствии JWT_SECRET в production приложение падает на старте
// (fail-fast), чтобы исключить подделку сессий по зашитому dev-секрету.
const DEV_FALLBACK_SECRET = "komi-kyv-dev-secret-change-in-production-please-32bytes";
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[auth] JWT_SECRET обязателен в production (минимум 32 символа). " +
      "Сгенерируйте: openssl rand -hex 32 — и добавьте в .env"
    );
  }
  if (secret) {
    console.warn("[auth] JWT_SECRET короче 32 символов — используется с ослабленной стойкостью");
    return secret;
  }
  return DEV_FALLBACK_SECRET;
})();

const JWT_ISSUER = "komi-kyv";
const JWT_EXPIRES_SEC = 60 * 60 * 24 * 7; // 7 days

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: string;
  name?: string | null;
  twofa?: boolean; // сессия подтверждена вторым фактором (TOTP)
  typ?: string; // "session" | "2fa_pending" (токен-вызов для второго шага входа)
  iat: number;
  exp: number;
  iss: string;
}

export interface ChallengePayload {
  sub: string;
  email: string;
  typ: "2fa_pending";
  iat: number;
  exp: number;
  iss: string;
}

function base64UrlEncode(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function signToken(payload: Omit<JWTPayload, "iat" | "exp" | "iss">): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JWTPayload = {
    ...payload,
    iss: JWT_ISSUER,
    iat: now,
    exp: now + JWT_EXPIRES_SEC,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(full));
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", JWT_SECRET).update(data).digest();
  return `${data}.${sig.toString("base64url")}`;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.iss !== JWT_ISSUER) return null;
    // Токены-вызовы (2fa_pending) нельзя использовать как сессии
    if (payload.typ && payload.typ !== "session") return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// Токен-вызов для второго шага входа (2FA)
// ============================================================

const CHALLENGE_TTL_SEC = 5 * 60; // 5 минут на ввод кода

/** Короткоживущий токен: пароль проверен, ждём код TOTP. */
export function signChallengeToken(userId: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ChallengePayload = {
    sub: userId,
    email,
    typ: "2fa_pending",
    iss: JWT_ISSUER,
    iat: now,
    exp: now + CHALLENGE_TTL_SEC,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", JWT_SECRET).update(data).digest();
  return `${data}.${sig.toString("base64url")}`;
}

export function verifyChallengeToken(token: string): ChallengePayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as ChallengePayload;
    if (payload.typ !== "2fa_pending") return null;
    if (payload.iss !== JWT_ISSUER) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// Session helpers (server-side, uses cookies())
// ============================================================

const COOKIE_NAME = "komi_session";

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: JWT_EXPIRES_SEC,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value;
}

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  fullName: string | null;
  isActive: boolean;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, email: true, role: true, fullName: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error("FORBIDDEN");
  return u;
}

// ============================================================
// Guard для чувствительных админ-операций (редактор БД)
// Требует роль admin И активную 2FA-сессию (twofa: true в JWT)
// ============================================================

export type Admin2FACheck =
  | { ok: true; user: SessionUser }
  | { ok: false; code: "UNAUTHORIZED" | "FORBIDDEN" | "TWOFA_SETUP_REQUIRED" | "TWOFA_REQUIRED"; status: number };

export async function requireAdmin2FA(): Promise<Admin2FACheck> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "UNAUTHORIZED", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { ok: false, code: "UNAUTHORIZED", status: 401 };
  const user = await db.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, email: true, role: true, fullName: true, isActive: true, totpEnabled: true },
  });
  if (!user || !user.isActive) return { ok: false, code: "UNAUTHORIZED", status: 401 };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN", status: 403 };
  if (!user.totpEnabled) {
    // Администратор ещё не включил 2FA — редактор БД недоступен,
    // пока она не будет настроена (Настройки → Безопасность)
    return { ok: false, code: "TWOFA_SETUP_REQUIRED", status: 403 };
  }
  if (payload.twofa !== true) {
    // 2FA включена, но текущая сессия входила без второго фактора
    return { ok: false, code: "TWOFA_REQUIRED", status: 401 };
  }
  return { ok: true, user };
}

// ============================================================
// IP / User-Agent capture for audit logs
// ============================================================

export function getRequestMeta(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return { ip, ua };
}
