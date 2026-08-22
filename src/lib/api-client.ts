// Client-side fetch helper with credentials and JSON handling.
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
  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: "include",
    body: json !== undefined ? JSON.stringify(json) : (rest as any).body,
  });
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
