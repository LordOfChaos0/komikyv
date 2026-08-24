"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Home, BookOpen, Library, MessageCircle, Compass } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    // Сохраняем запрос — SPA прочитает его на главной и откроет палитру поиска
    sessionStorage.setItem("komi_search", q.trim());
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {/* Орнамент-разделитель и крупный код */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-chart-3 text-primary-foreground shadow-lg">
          <Compass className="h-10 w-10" />
        </div>

        <div className="text-7xl font-black tracking-tight text-primary/20 select-none">
          404
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">
          Страница не найдена
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Похоже, такой страницы не существует или она была перемещена.
          Попробуйте найти нужный материал через поиск или перейдите
          в один из основных разделов платформы.
        </p>

        {/* Поиск */}
        <form onSubmit={submitSearch} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по модулям, словам, грамматике..."
              className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Найти
          </button>
        </form>

        {/* Быстрые ссылки */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/"
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <Home className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Главная</span>
          </Link>
          <Link
            href="/"
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Модули</span>
          </Link>
          <Link
            href="/"
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <Library className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Словарь</span>
          </Link>
          <Link
            href="/"
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
          >
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Тренажёр</span>
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Коми кыв · Платформа изучения коми языка
        </p>
      </div>
    </div>
  );
}
