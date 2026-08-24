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
// IP / User-Agent capture for audit logs
// ============================================================

export function getRequestMeta(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return { ip, ua };
}
