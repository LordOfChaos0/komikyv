import { NextResponse } from "next/server";

// ============================================================
// GET /api-docs (REC 5.4)
// Swagger UI для OpenAPI-спецификации платформы.
// Ресурсы Swagger UI раздаются локально из /public/swagger-ui
// (без внешних CDN — работает в закрытых сетях).
// ============================================================

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Коми кыв — API документация</title>
  <link rel="stylesheet" href="/swagger-ui/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafaf9; }
    .topbar { display: none; }
    #header {
      background: linear-gradient(135deg, #2d6a4f, #40916c);
      padding: 20px 24px;
      color: #fff;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }
    #header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    #header p { margin: 4px 0 0; opacity: 0.85; font-size: 14px; }
    #header a { color: #d8f3dc; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="header">
    <h1>Коми кыв — API платформы изучения коми языка</h1>
    <p>
      OpenAPI 3.0 · аутентификация через cookie <code>komi_session</code> ·
      CSRF-защита мутаций ·
      <a href="/api/openapi.json">скачать спецификацию</a>
    </p>
  </div>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "list",
        defaultModelsExpandDepth: 1,
        persistAuthorization: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ["get", "post", "put", "patch", "delete"],
      });
    };
  </script>
</body>
</html>`;

export function GET() {
  return new NextResponse(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
