// Client-side fetch helper with credentials, CSRF protection and JSON handling.

const CSRF_COOKIE = "komi_csrf";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("admin_token");
}

/**
 * Глобальное событие: сервер потребовал токен администратора
 * (403 + заголовок x-admin-token-required). AppShell слушает его
 * и показывает диалог ввода токена.
 */
export function notifyAdminTokenRequired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin-token-required"));
  }
}

export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit & { json?: any }
): Promise<T> {
  const { json, ...rest } = options || {};
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> || {}),
  };
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const method = (rest.method || "GET").toUpperCase();
  if (MUTATING.has(method)) {
    const csrf = getCookie(CSRF_COOKIE);
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  const adminToken = getAdminToken();
  if (adminToken) headers["X-Admin-Token"] = adminToken;

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: "include",
    body: json !== undefined ? JSON.stringify(json) : (rest as any).body,
  });

  // Сервер требует админ-токен — уведомляем UI
  if (res.status === 403 && res.headers.get("x-admin-token-required") === "true") {
    notifyAdminTokenRequired();
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      (typeof data === "object" && data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    const err = new Error(message) as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
