"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import {
  Zap,
  Flame,
  BookOpen,
  Target,
  TrendingUp,
  Award,
  Clock,
  Calendar,
} from "lucide-react";

export function ProgressView() {
  const { navigate } = useNav();
  const { data, isLoading } = useQuery({
    queryKey: ["progress"],
    queryFn: () => apiFetch<any>("/api/progress"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Загрузка прогресса...</div>
      </div>
    );
  }

  const { profile, stats, activityChart, recentActivity } = data;
  const levelLabel =
    profile.level === "advanced" ? "Продвинутый" : profile.level === "intermediate" ? "Средний" : "Начальный";
  const nextLevelXp = profile.level === "beginner" ? 300 : profile.level === "intermediate" ? 1200 : 5000;
  const prevLevelXp = profile.level === "beginner" ? 0 : profile.level === "intermediate" ? 300 : 1200;
  const levelProgress = Math.round(((profile.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BarChart className="h-7 w-7 text-primary" />
          Мой прогресс
        </h1>
        <p className="text-muted-foreground mt-1">
          Отслеживайте свои успехи в изучении коми языка
        </p>
      </div>

      {/* Level card */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Текущий уровень</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {levelLabel}
                <Badge variant="secondary" className="text-xs">{profile.xp} XP</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">До следующего уровня</div>
              <div className="text-sm font-medium">{nextLevelXp - profile.xp} XP</div>
            </div>
          </div>
          <Progress value={levelProgress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{prevLevelXp} XP</span>
            <span>{nextLevelXp} XP</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="Всего XP" value={profile.xp} color="from-chart-2 to-chart-1" />
        <StatCard icon={Flame} label="Серия дней" value={profile.currentStreak} sub={`Рекорд: ${profile.longestStreak}`} color="from-chart-3 to-chart-5" />
        <StatCard icon={BookOpen} label="Уроков пройдено" value={`${stats.completedLessons}/${stats.totalLessons}`} color="from-chart-1 to-chart-4" />
        <StatCard icon={Target} label="Средний балл" value={`${stats.avgScore}%`} color="from-chart-4 to-chart-2" />
      </div>

      {/* Activity chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Активность за неделю
          </CardTitle>
          <CardDescription>Количество упражнений и полученный XP по дням</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 80)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString("ru-RU", { weekday: "short" })}
                stroke="oklch(0.5 0.02 70)"
                fontSize={12}
              />
              <YAxis stroke="oklch(0.5 0.02 70)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.9 0.02 80)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(d) => new Date(d).toLocaleDateString("ru-RU")}
              />
              <Bar dataKey="count" name="Упражнений" fill="oklch(0.55 0.16 145)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Последняя активность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Пока нет активности. Начните свой первый урок!
            </p>
          ) : (
            recentActivity.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  a.isCompleted ? "bg-chart-1/15 text-chart-1" : "bg-chart-3/15 text-chart-3"
                }`}>
                  {a.isCompleted ? <Award className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.lesson?.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <Badge variant={a.isCompleted ? "default" : "secondary"}>
                  {a.score}%
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <button
          onClick={() => navigate("modules")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Продолжить обучение
        </button>
        <button
          onClick={() => navigate("achievements")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
        >
          <Award className="h-4 w-4" />
          Мои достижения
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card>
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
