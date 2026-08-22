"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Flame,
  Zap,
  BookOpen,
  MessageCircle,
  Repeat,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export function DailyGoalWidget() {
  const { navigate } = useNav();
  const { data, isLoading } = useQuery({
    queryKey: ["daily-progress"],
    queryFn: () => apiFetch<any>("/api/daily-progress"),
    refetchInterval: 60000, // refresh every minute
  });

  if (isLoading || !data) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-chart-1 to-chart-2" />
        <CardContent className="p-5">
          <div className="h-24 skeleton-shimmer rounded" />
        </CardContent>
      </Card>
    );
  }

  const {
    dailyGoal,
    xpToday,
    goalPercent,
    isGoalReached,
    remaining,
    streak,
    longestStreak,
    breakdown,
    week,
  } = data;

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 ${isGoalReached ? "bg-chart-1" : "bg-gradient-to-r from-chart-1 to-chart-2"}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Target className={`h-5 w-5 ${isGoalReached ? "text-chart-1" : "text-primary"}`} />
              Цель на сегодня
            </h3>
            <p className="text-sm text-muted-foreground">
              {isGoalReached
                ? "🎉 Цель достигнута! Так держать!"
                : `${remaining} XP до цели`}
            </p>
          </div>
          {isGoalReached && (
            <Badge className="bg-chart-1/15 text-chart-1 border-chart-1/20">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Готово
            </Badge>
          )}
        </div>

        {/* XP progress */}
        <div className="space-y-2 mb-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{xpToday}</span>
              <span className="text-sm text-muted-foreground">/ {dailyGoal} XP</span>
            </div>
            <span className={`text-sm font-medium ${isGoalReached ? "text-chart-1" : "text-muted-foreground"}`}>
              {goalPercent}%
            </span>
          </div>
          <Progress value={goalPercent} className={`h-3 ${isGoalReached ? "[&>div]:bg-chart-1" : ""}`} />
        </div>

        {/* Streak */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{streak}</span>
              <span className="text-xs text-muted-foreground">дней подряд</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Рекорд: {longestStreak} дней
            </div>
          </div>
          {streak === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("modules")}
            >
              Начать
            </Button>
          )}
        </div>

        {/* Today's activity breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <ActivityItem
            icon={BookOpen}
            label="Уроки"
            value={breakdown.lessons}
            color="text-chart-1"
            onClick={() => navigate("modules")}
          />
          <ActivityItem
            icon={MessageCircle}
            label="Диалоги"
            value={breakdown.dialogs}
            color="text-chart-2"
            onClick={() => navigate("dialog")}
          />
          <ActivityItem
            icon={Repeat}
            label="SRS"
            value={breakdown.srsReviews}
            color="text-chart-3"
            onClick={() => navigate("srs")}
          />
        </div>

        {/* CTA */}
        {!isGoalReached && (
          <Button
            className="w-full"
            variant="default"
            onClick={() => navigate("flashcards")}
          >
            <Zap className="h-4 w-4 mr-1" />
            Продолжить обучение
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-center"
    >
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}
