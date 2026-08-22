"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import {
  Users,
  BookOpen,
  MessageCircle,
  Trophy,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";

export function AdminDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch<any>("/api/admin/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Загрузка дашборда...</div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          Панель администратора
        </h1>
        <p className="text-muted-foreground mt-1">
          Статистика и мониторинг платформы «Коми кыв»
        </p>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Пользователей"
          value={d.users.total}
          sub={`${d.users.students} учеников · ${d.users.teachers} преподавателей`}
          color="from-chart-1 to-chart-4"
        />
        <StatCard
          icon={BookOpen}
          label="Учебных модулей"
          value={d.content.modules}
          sub={`${d.content.publishedModules} опубликовано · ${d.content.onModerationModules} на модерации`}
          color="from-chart-2 to-chart-1"
        />
        <StatCard
          icon={MessageCircle}
          label="Диалогов"
          value={d.activity.totalDialogs}
          sub={`${d.activity.finishedDialogs} завершено`}
          color="from-chart-3 to-chart-5"
        />
        <StatCard
          icon={Activity}
          label="Прохождений уроков"
          value={d.activity.totalProgress}
          sub={`Всего попыток`}
          color="from-chart-4 to-chart-2"
        />
      </div>

      {/* Content stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={BookOpen} label="Уроков" value={d.content.lessons} />
        <MiniStat icon={Activity} label="Упражнений" value={d.content.exercises} />
        <MiniStat icon={Zap} label="Слов в словаре" value={d.content.vocabulary} />
        <MiniStat icon={Trophy} label="Достижений" value={d.content.achievements} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Регистрации (14 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.charts.registrations}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 80)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "numeric" })}
                  stroke="oklch(0.5 0.02 70)"
                  fontSize={11}
                />
                <YAxis stroke="oklch(0.5 0.02 70)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid oklch(0.9 0.02 80)", borderRadius: "8px", fontSize: "12px" }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("ru-RU")}
                />
                <Bar dataKey="count" name="Регистраций" fill="oklch(0.55 0.16 145)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Активность (14 дней)
            </CardTitle>
            <CardDescription>Прохождения уроков и завершённые</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.charts.activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 80)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "numeric" })}
                  stroke="oklch(0.5 0.02 70)"
                  fontSize={11}
                />
                <YAxis stroke="oklch(0.5 0.02 70)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid oklch(0.9 0.02 80)", borderRadius: "8px", fontSize: "12px" }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("ru-RU")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="count" name="Всего" stroke="oklch(0.55 0.16 145)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" name="Завершено" stroke="oklch(0.7 0.15 70)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Security stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Безопасность
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Успешных входов</span>
              <Badge variant="outline" className="text-chart-1">{d.activity.authLogsSuccess}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Неудачных попыток</span>
              <Badge variant="outline" className="text-chart-3">{d.activity.authLogsFailed}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Активных администраторов</span>
              <Badge variant="secondary">{d.users.admins}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Топ учеников
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.topUsers.map((u: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? "bg-chart-2 text-white" : i === 1 ? "bg-chart-1 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 truncate text-sm">{u.name}</div>
                <Badge variant="secondary" className="text-xs">{u.xp} XP</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
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
        <div className="text-sm text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="text-lg font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
