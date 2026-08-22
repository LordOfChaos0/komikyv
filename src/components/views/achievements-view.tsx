"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as Icons from "lucide-react";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";

export function AchievementsView() {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => apiFetch<any[]>("/api/achievements"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Загрузка достижений...</div>
      </div>
    );
  }

  if (!achievements) return null;

  const earned = achievements.filter((a) => a.earned);
  const totalXpReward = earned.reduce((s, a) => s + a.xpReward, 0);
  const earnedPercent = Math.round((earned.length / achievements.length) * 100);

  const categories = [
    { id: "learning", label: "Обучение", color: "chart-1" },
    { id: "streak", label: "Серии занятий", color: "chart-3" },
    { id: "dialog", label: "Диалоги", color: "chart-2" },
    { id: "social", label: "Социальные", color: "chart-5" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-7 w-7 text-chart-2" />
          Достижения
        </h1>
        <p className="text-muted-foreground mt-1">
          Зарабатывайте XP и открывайте новые достижения
        </p>
      </div>

      {/* Summary */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-chart-2 via-chart-3 to-chart-5" />
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-chart-1">{earned.length}</div>
              <div className="text-sm text-muted-foreground">из {achievements.length} получено</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-chart-2">+{totalXpReward}</div>
              <div className="text-sm text-muted-foreground">XP от достижений</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-chart-3">{earnedPercent}%</div>
              <div className="text-sm text-muted-foreground">прогресс</div>
            </div>
          </div>
          <Progress value={earnedPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Categories */}
      {categories.map((cat) => {
        const items = achievements.filter((a) => a.category === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id} className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {cat.label}
              <Badge variant="secondary" className="text-xs">
                {items.filter((a) => a.earned).length}/{items.length}
              </Badge>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => {
                const Icon = (Icons as any)[a.icon] || Trophy;
                return (
                  <Card
                    key={a.id}
                    className={`overflow-hidden transition-all ${
                      a.earned
                        ? "border-chart-2/30 bg-chart-2/5 hover:shadow-md"
                        : "opacity-70"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
                            a.earned
                              ? `bg-gradient-to-br from-chart-2 to-chart-3 text-white`
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.earned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold flex items-center gap-1.5">
                            {a.title}
                            {a.earned && <CheckCircle2 className="h-3.5 w-3.5 text-chart-1 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {a.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {a.xpReward > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +{a.xpReward} XP
                              </Badge>
                            )}
                            {a.earned && a.earnedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(a.earnedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
