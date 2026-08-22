"use client";

import { useNav } from "@/lib/nav-store";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  BookOpen,
  MessageCircle,
  Library,
  Trophy,
  Users,
  Sparkles,
  ArrowRight,
  Flame,
  Zap,
  GraduationCap,
  Mic,
  Bot,
  ShieldCheck,
  TrendingUp,
  Layers,
} from "lucide-react";

export function HomeView() {
  const { navigate } = useNav();
  const { user } = useAuth();

  const { data: modules } = useQuery({
    queryKey: ["modules", { pageSize: 3 }],
    queryFn: () => apiFetch<{ items: any[] }>("/api/modules?pageSize=3"),
  });

  const { data: progress } = useQuery({
    queryKey: ["progress"],
    queryFn: () => apiFetch<any>("/api/progress"),
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/95 via-primary to-chart-3/90 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 komi-ornament opacity-30" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-chart-2/30 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-chart-5/20 blur-3xl" />
        <div className="relative px-6 sm:px-10 py-10 sm:py-14 max-w-4xl">
          <Badge className="mb-4 bg-white/15 text-white border-white/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Сохраняем язык народа коми
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            Изучай коми язык <br className="hidden sm:block" />с искусственным интеллектом
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/90 max-w-2xl mb-8 leading-relaxed">
            Интерактивные уроки, диалоговый тренажёр на базе нейросетей, тренировка
            произношения и геймификация. Для начинающих и продолжающих.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("modules")}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  К урокам
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("dialog")}
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Диалоговый тренажёр
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("register")}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Начать обучение
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("login")}
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                >
                  Войти
                </Button>
              </>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
            <StatBadge icon={BookOpen} label="Модулей" value="4+" />
            <StatBadge icon={Library} label="Слов в словаре" value="80+" />
            <StatBadge icon={MessageCircle} label="Диалогов" value="4" />
            <StatBadge icon={Trophy} label="Достижений" value="12" />
          </div>
        </div>
      </section>

      {/* Personal progress (if logged in) */}
      {user && progress && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Zap}
            label="Опыт (XP)"
            value={progress.stats.totalXp}
            sub={`Уровень: ${levelLabel(progress.stats.level)}`}
            color="from-chart-2 to-chart-1"
          />
          <StatCard
            icon={Flame}
            label="Серия дней"
            value={progress.stats.streak}
            sub={`Рекорд: ${progress.stats.longestStreak}`}
            color="from-chart-3 to-chart-5"
          />
          <StatCard
            icon={BookOpen}
            label="Уроков пройдено"
            value={`${progress.stats.completedLessons}/${progress.stats.totalLessons}`}
            sub={`Средний балл: ${progress.stats.avgScore}%`}
            color="from-chart-1 to-chart-4"
          />
          <StatCard
            icon={TrendingUp}
            label="Общий прогресс"
            value={`${progress.stats.progressPercent}%`}
            sub={`Модулей: ${progress.stats.totalModules}`}
            color="from-chart-4 to-chart-5"
          />
        </section>
      )}

      {/* Daily challenge widget (logged in only) */}
      {user && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Задания на сегодня</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Выполните ежедневные задания для поддержания серии
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DailyChallengeCard
              title="Пройти урок"
              description="Завершите один урок сегодня"
              icon={BookOpen}
              color="from-chart-1 to-chart-4"
              cta="К урокам"
              onClick={() => navigate("modules")}
            />
            <DailyChallengeCard
              title="Тренировать карточки"
              description="10 карточек для запоминания"
              icon={Layers}
              color="from-chart-2 to-chart-1"
              cta="Открыть карточки"
              onClick={() => navigate("flashcards")}
            />
            <DailyChallengeCard
              title="Диалог с ИИ"
              description="Проведите одну тренировку диалога"
              icon={Bot}
              color="from-chart-3 to-chart-5"
              cta="Начать диалог"
              onClick={() => navigate("dialog")}
            />
          </div>
        </section>
      )}

      {/* Features */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Возможности платформы</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Всё необходимое для эффективного изучения коми языка
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={BookOpen}
            title="Интерактивные уроки"
            description="Упражнения на перевод, сопоставление, заполнение пропусков и аудио-распознавание с мгновенной проверкой."
            color="text-chart-1 bg-chart-1/10"
            onClick={() => navigate("modules")}
          />
          <FeatureCard
            icon={Bot}
            title="Диалоговый тренажёр"
            description="Ведите диалог с ИИ на коми языке. Нейросеть оценивает грамматику, лексику и даёт обратную связь."
            color="text-chart-2 bg-chart-2/10"
            onClick={() => navigate("dialog")}
          />
          <FeatureCard
            icon={Mic}
            title="Тренировка произношения"
            description="Записывайте голос через микрофон и получайте оценку точности произношения с помощью ASR-модели."
            color="text-chart-3 bg-chart-3/10"
            onClick={() => navigate("pronunciation")}
          />
          <FeatureCard
            icon={Layers}
            title="Карточки слов"
            description="Тренируйте запоминание коми слов в обоих направлениях с помощью интерактивных флеш-карточек."
            color="text-chart-2 bg-chart-2/10"
            onClick={() => navigate("flashcards")}
          />
          <FeatureCard
            icon={Trophy}
            title="Геймификация"
            description="Зарабатывайте XP, открывайте достижения, поддерживайте серию занятий и поднимайтесь в рейтинге."
            color="text-chart-4 bg-chart-4/10"
            onClick={() => navigate("achievements")}
          />
          <FeatureCard
            icon={GraduationCap}
            title="Конструктор модулей"
            description="Преподаватели создают собственные учебные модули с уроками, словарём и упражнениями."
            color="text-chart-5 bg-chart-5/10"
            onClick={() => user?.role === "teacher" || user?.role === "admin" ? navigate("teacher-modules") : navigate("about")}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Соответствие 152-ФЗ"
            description="Согласие на обработку данных, мягкое удаление аккаунта, шифрование голосовых слепков."
            color="text-primary bg-primary/10"
            onClick={() => navigate("about")}
          />
        </div>
      </section>

      {/* Featured modules */}
      {modules && modules.items.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Популярные модули</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Начните с этих обучающих курсов
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("modules")}>
              Все модули
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.items.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>
        </section>
      )}

      {/* CTA for guests */}
      {!user && (
        <section className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="komi-divider" />
          <div className="p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Готовы начать изучение коми языка?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Зарегистрируйтесь бесплатно и получите доступ ко всем урокам,
              диалоговому тренажёру и словарю.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" onClick={() => navigate("register")}>
                Создать аккаунт
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("about")}>
                Узнать больше
              </Button>
            </div>
            <div className="mt-6 text-xs text-muted-foreground">
              Демо-доступ: <code className="bg-muted px-1.5 py-0.5 rounded">student@komikyv.ru</code> / <code className="bg-muted px-1.5 py-0.5 rounded">Student123!</code>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function levelLabel(level: string) {
  return level === "advanced" ? "Продвинутый" : level === "intermediate" ? "Средний" : "Начальный";
}

function StatBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-2.5 border border-white/10">
      <div className="flex items-center gap-2 text-white/80 text-xs">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-white text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

function DailyChallengeCard({
  title,
  description,
  icon: Icon,
  color,
  cta,
  onClick,
}: {
  title: string;
  description: string;
  icon: any;
  color: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer relative"
      onClick={onClick}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color}`} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shrink-0 shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">+20 XP</span>
          <span className="text-primary font-medium group-hover:underline flex items-center gap-1">
            {cta}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function FeatureCard({ icon: Icon, title, description, color, onClick }: any) {
  return (
    <Card className="hover:shadow-md transition-all cursor-pointer group" onClick={onClick}>
      <CardContent className="p-5">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${color} mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
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
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => navigate("modules", { selectedModuleId: m.id })}
    >
      <div className={`h-28 bg-gradient-to-br ${colorMap[m.coverColor] || colorMap.emerald} relative`}>
        <div className="absolute inset-0 komi-ornament opacity-40" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/20 text-white border-white/20 backdrop-blur">
            {levelLabel}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3 text-white/90 text-xs">
          ~{m.estimatedMin} мин
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {m.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
        {m.lessonsCount > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{m.lessonsCount} уроков</span>
            {m.completedLessons > 0 && (
              <span className="text-primary font-medium">{m.completedLessons}/{m.lessonsCount}</span>
            )}
          </div>
        )}
        {m.progress > 0 && (
          <Progress value={m.progress} className="h-1.5 mt-2" />
        )}
      </CardContent>
    </Card>
  );
}
