"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Flame, TrendingUp, Loader2 } from "lucide-react";
import { useState } from "react";

// GitHub-style activity heatmap
export function ActivityHeatmap() {
  const [hoveredDay, setHoveredDay] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: () => apiFetch<{ days: any[]; stats: any }>("/api/activity"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { days, stats } = data;
  // Group days into weeks (columns of 7)
  // days is sorted ascending, oldest first. We need to align by weekday.
  // First, find the weekday of the first day (oldest)
  const firstDate = new Date(days[0].date);
  const firstWeekday = firstDate.getDay(); // 0=Sun, 6=Sat
  // Pad with empty cells at the start
  const padded: (any | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) padded.push(null);
  padded.push(...days);

  // Build weeks (columns of 7)
  const weeks: (any | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // Max value for color scaling
  const maxTotal = Math.max(...days.map((d) => d.total), 1);

  const getLevel = (total: number): number => {
    if (total === 0) return 0;
    const ratio = total / maxTotal;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  const levelColors = [
    "bg-muted/40",
    "bg-chart-1/20",
    "bg-chart-1/40",
    "bg-chart-1/60",
    "bg-chart-1",
  ];

  // Month labels (approximate positions)
  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIdx) => {
    const firstDay = week.find((d) => d);
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          weekIdx,
          label: new Date(firstDay.date).toLocaleDateString("ru-RU", { month: "short" }),
        });
        lastMonth = month;
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Активность за год
        </CardTitle>
        <CardDescription>
          {stats.activeDays} активных дней из 365 · {stats.currentStreak} дней подряд
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MiniStat
            icon={Flame}
            label="Серия"
            value={stats.currentStreak}
            sub="дней"
            color="text-chart-3"
          />
          <MiniStat
            icon={TrendingUp}
            label="Рекорд"
            value={stats.longestStreak}
            sub="дней"
            color="text-chart-2"
          />
          <MiniStat
            icon={Calendar}
            label="Активных дней"
            value={stats.activeDays}
            sub="из 365"
            color="text-chart-1"
          />
          <MiniStat
            icon={TrendingUp}
            label="XP за год"
            value={stats.xp}
            sub="накоплено"
            color="text-primary"
          />
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto scrollbar-thin">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* Month labels */}
            <div className="flex gap-1 pl-7 mb-1">
              {weeks.map((_, weekIdx) => {
                const label = monthLabels.find((m) => m.weekIdx === weekIdx);
                return (
                  <div
                    key={weekIdx}
                    className="w-3 text-[10px] text-muted-foreground"
                    style={{ minWidth: "12px" }}
                  >
                    {label?.label || ""}
                  </div>
                );
              })}
            </div>
            {/* Days grid */}
            <div className="flex gap-1">
              {/* Weekday labels */}
              <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted-foreground justify-around">
                <div className="h-3">Пн</div>
                <div className="h-3">Ср</div>
                <div className="h-3">Пт</div>
              </div>
              {/* Weeks */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-sm transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer ${
                        day ? levelColors[getLevel(day.total)] : "opacity-0"
                      }`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={day ? formatDayTooltip(day) : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Меньше</span>
            {levelColors.map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span>Больше</span>
          </div>
          {hoveredDay && (
            <div className="text-xs">
              <span className="font-medium text-foreground">
                {new Date(hoveredDay.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
              : {hoveredDay.total} активностей · {hoveredDay.xp} XP
            </div>
          )}
        </div>

        {/* Activity breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-chart-1">{stats.lessons}</div>
            <div className="text-xs text-muted-foreground">Уроков за год</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-chart-2">{stats.dialogs}</div>
            <div className="text-xs text-muted-foreground">Диалогов</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-chart-3">{stats.reviews}</div>
            <div className="text-xs text-muted-foreground">Повторений SRS</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <div className="font-bold text-sm">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label} {sub && `· ${sub}`}</div>
      </div>
    </div>
  );
}

function formatDayTooltip(day: any): string {
  const date = new Date(day.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  return `${date}: ${day.total} активностей, ${day.xp} XP`;
}
