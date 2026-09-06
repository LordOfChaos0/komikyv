"use client";

import { useEffect, useState } from "react";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

// ============================================================
// Баннер согласия на использование cookie.
// Показывается один раз до принятия решения (localStorage).
// Выбор: «Принять все» / «Только необходимые».
// Технически необходимые cookie (сессия komi_session, CSRF-токен
// komi_csrf) работают всегда — без них невозможны вход и защита
// от подделки запросов. Решение сохраняется локально.
// ============================================================

const STORAGE_KEY = "komi_cookie_consent";
const STORAGE_DATE_KEY = "komi_cookie_consent_at";

export type CookieConsent = "accepted" | "necessary";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "necessary" ? v : null;
}

export function CookieConsentBanner() {
  const { navigate } = useNav();
  // Монтируется скрытым — решение читаем только на клиенте,
  // чтобы избежать расхождения при SSR-гидратации
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) {
      const t = window.setTimeout(() => setVisible(true), 600);
      return () => window.clearTimeout(t);
    }
  }, []);

  const decide = (choice: CookieConsent) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
      window.localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString());
    } catch {
      // localStorage может быть недоступен (приватный режим) —
      // просто скрываем баннер на текущую сессию
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Уведомление об использовании cookie"
      className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card/95 backdrop-blur shadow-lg p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-sm">Мы используем файлы cookie</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Cookie необходимы для входа в аккаунт, защиты от CSRF-атак и сохранения
              ваших настроек (тема, цель XP, голос). Технически необходимые cookie
              работают всегда.{" "}
              <button
                onClick={() => navigate("about")}
                className="text-primary underline-offset-2 hover:underline"
              >
                Подробнее о данных и 152-ФЗ
              </button>
              .
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setVisible(false)}
            aria-label="Скрыть уведомление"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide("necessary")}
          >
            Только необходимые
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Принять все
          </Button>
        </div>
      </div>
    </div>
  );
}
