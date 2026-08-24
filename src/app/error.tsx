"use client";

import { useEffect } from "react";
import { Wrench, RefreshCw, Mail, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку в консоль сервера недоступен из клиента —
    // отправляем на серверный лог-эндпоинт при желании можно расширить
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-chart-3 to-primary text-primary-foreground shadow-lg">
          <Wrench className="h-10 w-10" />
        </div>

        <div className="text-7xl font-black tracking-tight text-chart-3/20 select-none">
          500
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">
          Технические работы
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          На сервере произошла непредвиденная ошибка. Мы уже работаем
          над устранением проблемы. Попробуйте обновить страницу
          или вернуться позже.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Код ошибки: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Повторить попытку
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            На главную
          </a>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border text-left">
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Проблема повторяется?</span>
              <br />
              Напишите нам:{" "}
              <a href="mailto:support@komikyv.ru" className="text-primary hover:underline">
                support@komikyv.ru
              </a>
              {" "}— опишите действия, которые привели к ошибке, и код ошибки выше.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
