import { NextResponse } from "next/server";

// ============================================================
// GET /metrika.js — сниппет Яндекс.Метрики, генерируется сервером.
//
// Почему не инлайн-сниппет в layout и не NEXT_PUBLIC_переменная:
//   • инлайн-скрипт потребовал бы 'unsafe-inline' в CSP (уже есть,
//     но роут-файл чище и кэшируется);
//   • NEXT_PUBLIC_* вшивается при СБОРКЕ — смена номера счётчика
//     требовала бы пересборки. Здесь METRIKA_ID читается при
//     запросе: на VM достаточно вписать его в .env и перезапустить
//     сервис (systemctl restart komikyv).
// Метрика не настроена — отдаётся безвредный комментарий, поэтому
// тег <script src="/metrika.js"> в root-layout присутствует всегда.
// Инструкция по подключению — DEPLOY.md §13.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const id = (process.env.METRIKA_ID || "").trim();
  if (!id || !/^\d{1,10}$/.test(id)) {
    return new NextResponse(
      "/* Яндекс.Метрика не настроена: задайте METRIKA_ID (номер счётчика) в .env и перезапустите сервис */\n",
      {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-store",
        },
      }
    );
  }

  // Официальный асинхронный сниппет tag.js (webvisor, клики, ссылки,
  // точный показатель отказов). SPA-навигация Next.js работает через
  // History API — tag.js отслеживает смену URL автоматически.
  const js = `(function (m, e, t, r, i, k, a) {
  m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
  m[i].l = 1 * new Date();
  for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
  k = e.createElement(t);
  a = e.getElementsByTagName(t)[0];
  k.async = 1;
  k.src = r;
  a.parentNode.insertBefore(k, a);
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

window.ym(${id}, "init", {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true,
});
`;

  return new NextResponse(js, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      // 5 минут: смена METRIKA_ID на VM подхватывается без пересборки
      "cache-control": "public, max-age=300",
    },
  });
}
