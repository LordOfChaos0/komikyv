"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Clock, ChevronRight, SlidersHorizontal, X } from "lucide-react";

export function ModulesView() {
  const { navigate, params } = useNav();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-open module detail if navigated with selectedModuleId
  const { data: moduleDetail } = useQuery({
    queryKey: ["module-detail", params.selectedModuleId],
    queryFn: () => apiFetch<any>(`/api/modules/${params.selectedModuleId}`),
    enabled: !!params.selectedModuleId,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<any[]>("/api/categories"),
  });

  const queryParams = new URLSearchParams({
    pageSize: "9",
    page: String(page),
    sort,
  });
  if (q) queryParams.set("q", q);
  if (level !== "all") queryParams.set("level", level);
  if (category !== "all") queryParams.set("category", category);

  const { data, isLoading } = useQuery({
    queryKey: ["modules", queryParams.toString()],
    queryFn: () => apiFetch<{ items: any[]; total: number; totalPages: number }>(`/api/modules?${queryParams.toString()}`),
  });

  // Module detail view
  if (params.selectedModuleId && moduleDetail) {
    return <ModuleDetailView module={moduleDetail} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Учебные модули
        </h1>
        <p className="text-muted-foreground mt-1">
          Выберите модуль и начните обучение коми языку
        </p>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по названию..."
              className="pl-9"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border border-border bg-card">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Уровень</label>
              <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="beginner">Начальный</SelectItem>
                  <SelectItem value="intermediate">Средний</SelectItem>
                  <SelectItem value="advanced">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Категория</label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Сортировка</label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Сначала новые</SelectItem>
                  <SelectItem value="popular">Популярные</SelectItem>
                  <SelectItem value="az">По алфавиту (А-Я)</SelectItem>
                  <SelectItem value="level">По уровню</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-28 skeleton-shimmer" />
              <CardContent className="p-4 space-y-2">
                <div className="h-5 skeleton-shimmer rounded w-2/3" />
                <div className="h-3 skeleton-shimmer rounded w-full" />
                <div className="h-3 skeleton-shimmer rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((m, i) => (
            <div key={m.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <ModuleCard module={m} />
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Модули не найдены. Попробуйте изменить параметры поиска.</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Назад
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Страница {page} из {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}

function ModuleCard({ module: m }: { module: any }) {
  const { navigate } = useNav();
  const levelLabel =
    m.level === "advanced" ? "Продвинутый" : m.level === "intermediate" ? "Средний" : "Начальный";
  const colorMap: Record<string, string> = {
    amber: "from-chart-2/80 to-chart-3/70",
    rose: "from-chart-5/80 to-chart-3/70",
    emerald: "from-chart-1/80 to-chart-4/70",
    orange: "from-chart-3/80 to-chart-2/70",
    sky: "from-chart-4/80 to-chart-1/70",
    violet: "from-chart-5/80 to-chart-4/70",
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group hover-lift"
      onClick={() => navigate("modules", { selectedModuleId: m.id })}
    >
      <div className={`h-32 bg-gradient-to-br ${colorMap[m.coverColor] || colorMap.emerald} relative overflow-hidden`}>
        <div className="absolute inset-0 komi-ornament opacity-40" />
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/20 text-white border-white/20 backdrop-blur">
            {levelLabel}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/90 text-xs bg-black/20 backdrop-blur px-2 py-1 rounded-full">
          <Clock className="h-3 w-3" />
          {m.estimatedMin} мин
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {m.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
          {m.description}
        </p>
        {m.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {m.categories.slice(0, 2).map((c: any) => (
              <Badge key={c.id} variant="secondary" className="text-xs">
                {c.name}
              </Badge>
            ))}
          </div>
        )}
        {m.lessonsCount > 0 && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.lessonsCount} уроков</span>
              {m.completedLessons > 0 && (
                <span className="text-primary font-medium">{m.completedLessons}/{m.lessonsCount}</span>
              )}
            </div>
            {m.progress > 0 && (
              <Progress value={m.progress} className="h-1.5 mt-2" />
            )}
          </>
        )}
        <div className="mt-3 flex items-center text-xs text-primary font-medium">
          Открыть модуль
          <ChevronRight className="h-3.5 w-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleDetailView({ module: m }: { module: any }) {
  const { navigate, params } = useNav();
  const levelLabel =
    m.level === "advanced" ? "Продвинутый" : m.level === "intermediate" ? "Средний" : "Начальный";
  const colorMap: Record<string, string> = {
    amber: "from-chart-2/80 to-chart-3/70",
    rose: "from-chart-5/80 to-chart-3/70",
    emerald: "from-chart-1/80 to-chart-4/70",
    orange: "from-chart-3/80 to-chart-2/70",
    sky: "from-chart-4/80 to-chart-1/70",
    violet: "from-chart-5/80 to-chart-4/70",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("modules")}>
        ← Назад к модулям
      </Button>

      <Card className="overflow-hidden">
        <div className={`h-40 bg-gradient-to-br ${colorMap[m.coverColor] || colorMap.emerald} relative`}>
          <div className="absolute inset-0 komi-ornament opacity-40" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <Badge className="self-start bg-white/20 text-white border-white/20 backdrop-blur mb-2">
              {levelLabel}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{m.title}</h1>
          </div>
        </div>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-4">{m.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" /> {m.estimatedMin} мин
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="h-4 w-4" /> {m.lessons.length} уроков
            </div>
            {m.author && (
              <div className="text-muted-foreground">
                Автор: <span className="text-foreground">{m.author.fullName || m.author.email}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lessons list */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Уроки модуля</h2>
        {m.lessons.map((lesson: any, i: number) => (
          <Card
            key={lesson.id}
            className={`hover:shadow-md transition-all ${!lesson.unlocked ? "opacity-60" : "cursor-pointer"}`}
            onClick={() => {
              if (lesson.unlocked) {
                navigate("lesson", { lessonId: lesson.id, moduleId: m.id });
              }
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0 ${
                lesson.isCompleted
                  ? "bg-chart-1 text-white"
                  : lesson.unlocked
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {lesson.isCompleted ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{lesson.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {lesson.exercises?.length || (lesson as any)._count?.exercises || 0} упражнений
                  {lesson.bestScore !== null && lesson.bestScore !== undefined && (
                    <span className="ml-2">· Лучший балл: {lesson.bestScore}%</span>
                  )}
                  {!lesson.unlocked && (
                    <span className="ml-2 text-chart-3">🔒 Пройдите предыдущий урок</span>
                  )}
                </div>
              </div>
              {lesson.unlocked && <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
