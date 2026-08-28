"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useNav, type ViewName } from "@/lib/nav-store";
import { useAuth } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Search,
  Home,
  BookOpen,
  MessageCircle,
  Library,
  BarChart3,
  Trophy,
  Users,
  Database,
  User as UserIcon,
  GraduationCap,
  Shield,
  Award,
  Sparkles,
  Layers,
  Mic,
  Type,
  AlignLeft,
  Hash,
  ArrowRight,
  CornerDownLeft,
  CornerUpLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "navigation" | "modules" | "vocabulary" | "grammar" | "actions";
  view?: ViewName;
  params?: Record<string, any>;
  roles?: string[]; // optional role restriction
  action?: () => void;
  keywords?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  initialQuery,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialQuery?: string;
}) {
  const { navigate } = useNav();
  const { user } = useAuth();
  const [query, setQuery] = useState(initialQuery || "");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch modules and vocabulary for search
  const { data: modules } = useQuery({
    queryKey: ["palette-modules"],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/modules?pageSize=20`),
    enabled: open,
  });

  const { data: vocab } = useQuery({
    queryKey: ["palette-vocab"],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/vocabulary?pageSize=50&q=${encodeURIComponent(query)}`),
    enabled: open && query.length > 1,
  });

  const grammarSections = [
    { id: "alphabet", title: "Алфавит", icon: Type },
    { id: "phonetics", title: "Фонетика", icon: Mic },
    { id: "cases", title: "Падежи", icon: Layers },
    { id: "pronouns", title: "Местоимения", icon: UserIcon },
    { id: "verbs", title: "Глаголы", icon: Sparkles },
    { id: "numbers", title: "Числительные", icon: Hash },
    { id: "syntax", title: "Синтаксис", icon: AlignLeft },
    { id: "greetings", title: "Приветствия", icon: MessageCircle },
  ];

  // Build all items
  const allItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [
      { id: "nav-home", label: "Главная", icon: Home, group: "navigation", view: "home" },
      { id: "nav-modules", label: "Учебные модули", icon: BookOpen, group: "navigation", view: "modules" },
      { id: "nav-flashcards", label: "Карточки слов", icon: Layers, group: "navigation", view: "flashcards", roles: ["student", "teacher", "admin"] },
      { id: "nav-pronunciation", label: "Тренажёр произношения", icon: Mic, group: "navigation", view: "pronunciation", roles: ["student", "teacher", "admin"] },
      { id: "nav-dialog", label: "Диалоговый тренажёр", icon: MessageCircle, group: "navigation", view: "dialog", roles: ["student", "teacher", "admin"] },
      { id: "nav-vocabulary", label: "Словарь", icon: Library, group: "navigation", view: "vocabulary" },
      { id: "nav-progress", label: "Мой прогресс", icon: BarChart3, group: "navigation", view: "progress", roles: ["student", "teacher", "admin"] },
      { id: "nav-achievements", label: "Достижения", icon: Trophy, group: "navigation", view: "achievements", roles: ["student", "teacher", "admin"] },
      { id: "nav-leaderboard", label: "Рейтинг", icon: Users, group: "navigation", view: "leaderboard", roles: ["student", "teacher", "admin"] },
      { id: "nav-grammar", label: "Грамматика", icon: BookOpen, group: "navigation", view: "grammar" },
      { id: "nav-about", label: "О платформе", icon: Sparkles, group: "navigation", view: "about" },
    ];

    // Role-locked nav items
    if (user?.role === "teacher" || user?.role === "admin") {
      items.push({
        id: "nav-teacher",
        label: "Конструктор модулей",
        icon: GraduationCap,
        group: "navigation",
        view: "teacher-modules",
      });
    }
    if (user?.role === "admin") {
      items.push(
        { id: "nav-admin-dash", label: "Админ-дашборд", icon: Shield, group: "navigation", view: "admin-dashboard" },
        { id: "nav-admin-mod", label: "Модерация", icon: Award, group: "navigation", view: "admin-moderation" },
        { id: "nav-admin-users", label: "Пользователи", icon: Users, group: "navigation", view: "admin-users" },
        { id: "nav-admin-db", label: "База данных", icon: Database, group: "navigation", view: "admin-db", roles: ["admin"] },
      );
    }

    // Modules
    if (modules?.items) {
      for (const m of modules.items) {
        items.push({
          id: `mod-${m.id}`,
          label: m.title,
          description: `${m.level} · ${m.lessonsCount || 0} уроков`,
          icon: BookOpen,
          group: "modules",
          view: "modules",
          params: { selectedModuleId: m.id },
          keywords: m.description + " " + m.title,
        });
      }
    }

    // Grammar sections
    for (const g of grammarSections) {
      items.push({
        id: `gram-${g.id}`,
        label: `Грамматика: ${g.title}`,
        icon: g.icon,
        group: "grammar",
        view: "grammar",
        params: { section: g.id },
      });
    }

    // Vocabulary (only if query is set)
    if (vocab?.items) {
      for (const v of vocab.items.slice(0, 8)) {
        items.push({
          id: `voc-${v.id}`,
          label: v.wordKomi,
          description: v.translationRu,
          icon: Library,
          group: "vocabulary",
          view: "vocabulary",
          keywords: v.wordKomi + " " + v.translationRu,
        });
      }
    }

    return items;
  }, [user, modules, vocab]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 20);
    const q = query.toLowerCase();
    return allItems
      .filter((item) => {
        const text = (item.label + " " + (item.description || "") + " " + (item.keywords || "")).toLowerCase();
        return text.includes(q);
      })
      .slice(0, 25);
  }, [query, allItems]);

  // Group items
  const grouped = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Сброс строки поиска при закрытии палитры и передача наружу
  const handleOpenChange = (o: boolean) => {
    if (!o) setQuery("");
    onOpenChange(o);
  };

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (item: PaletteItem) => {
    if (item.view) {
      navigate(item.view, item.params);
    } else if (item.action) {
      item.action();
    }
    handleOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[activeIdx]) {
        handleSelect(filteredItems[activeIdx]);
      }
    } else if (e.key === "Escape") {
      handleOpenChange(false);
    }
  };

  const groupLabels: Record<string, string> = {
    navigation: "Навигация",
    modules: "Модули",
    vocabulary: "Словарь",
    grammar: "Грамматика",
    actions: "Действия",
  };

  let runningIdx = 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden top-[20%] translate-y-0" >
        {/* Search input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Поиск по платформе... (модули, слова, грамматика)"
            className="flex-1 px-3 py-4 bg-transparent outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {groupLabels[group] || group}
                </div>
                {items.map((item) => {
                  const idx = runningIdx++;
                  const isActive = idx === activeIdx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/70"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.description && (
                          <div className={cn("text-xs truncate", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">↑↓</kbd>
              навигация
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">↵</kbd>
              выбрать
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">esc</kbd>
              закрыть
            </span>
          </div>
          <span className="text-primary font-medium">Коми кыв</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
