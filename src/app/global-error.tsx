"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#fafaf9",
          color: "#232220",
          padding: "16px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "rgba(150, 68, 60, 0.2)",
              letterSpacing: "-2px",
            }}
          >
            500
          </div>
          <h1 style={{ fontSize: 26, margin: "8px 0 0" }}>Технические работы</h1>
          <p style={{ color: "#71717a", lineHeight: 1.6, margin: "12px 0 0" }}>
            Критическая ошибка приложения. Попробуйте обновить страницу.
            Если проблема повторяется — напишите на{" "}
            <a href="mailto:support@komikyv.ru" style={{ color: "#2d6a4f" }}>
              support@komikyv.ru
            </a>
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "#a1a1aa",
                marginTop: 8,
              }}
            >
              Код ошибки: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              height: 44,
              padding: "0 22px",
              borderRadius: 8,
              border: "none",
              background: "#2d6a4f",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Повторить попытку
          </button>
        </div>
      </body>
    </html>
  );
}
