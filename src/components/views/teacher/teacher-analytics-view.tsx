"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Users,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Loader2,
  Award,
  AlertTriangle,
  GraduationCap,
  Activity,
} from "lucide-react";

export function TeacherAnalyticsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-analytics"],
    queryFn: () => apiFetch<any>("/api/teacher/analytics"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { overview, moduleStats, students, activityChart, hardestLessons, recentActivity } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Аналитика
        </h1>
        <p className="text-muted-foreground mt-1">
          Статистика по вашим модулям и ученикам
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Модулей" value={overview.totalModules} color="from-chart-1 to-chart-4" />
        <StatCard icon={Users} label="Учеников" value={overview.totalStudents} color="from-chart-2 to-chart-1" />
        <StatCard icon={CheckCircle2} label="Завершено уроков" value={overview.totalCompletions} color="from-chart-3 to-chart-5" />
        <StatCard icon={TrendingUp} label="Средний балл" value={`${overview.overallAvg}%`} color="from-chart-4 to-chart-2" />
      </div>

      {/* Activity chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Активность учеников (30 дней)
          </CardTitle>
          <CardDescription>Попытки прохождения и завершённые уроки</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityChart}>
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
              <Bar dataKey="attempts" name="Попытки" fill="oklch(0.55 0.16 145)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Завершено" fill="oklch(0.7 0.15 70)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Module stats */}
      <div>
        <h2 className="text-lg font-bold mb-3">Статистика по модулям</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {moduleStats.map((m: any, i: number) => (
            <Card key={m.id} className="hover-lift animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{m.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {m.level === "advanced" ? "Продвинутый" : m.level === "intermediate" ? "Средний" : "Начальный"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{m.lessonsCount} уроков</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{m.avgScore}%</div>
                    <div className="text-xs text-muted-foreground">средний балл</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {m.enrollments} учеников
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {m.completions} завершено
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Hardest lessons */}
      {hardestLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-chart-3" />
              Самые сложные уроки
            </CardTitle>
            <CardDescription>Уроки с самым низким средним баллом</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hardestLessons.map((l: any, i: number) => (
              <div key={l.lessonId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-chart-3/15 text-chart-3 text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.lessonTitle}</div>
                  <div className="text-xs text-muted-foreground">{l.moduleTitle}</div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={l.avgScore < 50 ? "destructive" : "secondary"} className="text-xs">
                    {l.avgScore}%
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.attempts} попыток</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Students table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Ученики ({students.length})
          </CardTitle>
          <CardDescription>Прогресс учеников по вашим модулям</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Пока никто не проходил ваши модули</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-thin">
              {students.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {s.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{s.email}</span>
                      {s.streak > 0 && <span className="text-chart-3">🔥{s.streak}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="text-sm font-medium">{s.lessonsCompleted}/{s.lessonsAttempted}</div>
                    <div className="text-xs text-muted-foreground">уроков</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={s.avgScore >= 70 ? "default" : s.avgScore >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {s.avgScore}%
                    </Badge>
                  </div>
                  <div className="hidden lg:block text-right shrink-0">
                    <div className="text-sm font-medium text-chart-2">{s.xp} XP</div>
                    <div className="text-xs text-muted-foreground">{s.level}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Последняя активность
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 text-sm">
                <div className={`h-2 w-2 rounded-full ${a.isCompleted ? "bg-chart-1" : "bg-chart-3"}`} />
                <span className="font-medium">{a.studentName}</span>
                <span className="text-muted-foreground">{a.isCompleted ? "завершил" : "прошёл"}</span>
                <span className="font-medium truncate">{a.lessonTitle}</span>
                <Badge variant="outline" className="text-xs ml-auto shrink-0">{a.score}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
