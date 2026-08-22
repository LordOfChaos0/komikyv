"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Crown, Flame, Zap } from "lucide-react";

export function LeaderboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiFetch<any>("/api/leaderboard"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Загрузка рейтинга...</div>
      </div>
    );
  }

  if (!data) return null;

  const podium = data.top.slice(0, 3);
  const rest = data.top.slice(3);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Рейтинг учеников
        </h1>
        <p className="text-muted-foreground mt-1">
          Топ-{data.top.length} учеников по количеству XP
        </p>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 0, 2].map((idx) => {
          const u = podium[idx];
          if (!u) return <div key={idx} />;
          const heights = ["h-32", "h-40", "h-28"];
          const colors = [
            "from-chart-3 to-chart-5",
            "from-chart-2 to-chart-1",
            "from-chart-4 to-chart-2",
          ];
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={u.userId} className="flex flex-col items-center">
              <div className="text-2xl mb-1">{medals[idx]}</div>
              <Avatar className="h-14 w-14 mb-2 border-2 border-card shadow">
                <AvatarFallback className={`bg-gradient-to-br ${colors[idx]} text-white font-bold`}>
                  {u.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium text-center line-clamp-1 mb-1">
                {u.isMe ? "Это вы!" : u.name}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {u.xp} XP
              </div>
              <div className={`w-full ${heights[idx]} rounded-t-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold text-3xl`}>
                {u.rank}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest */}
      <Card>
        <CardContent className="p-0">
          {rest.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Пока нет других учеников в рейтинге</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rest.map((u: any) => (
                <div
                  key={u.userId}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    u.isMe ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="w-8 text-center font-semibold text-muted-foreground">
                    {u.rank}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {u.isMe ? "Вы" : u.name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-chart-2" />
                        {u.xp} XP
                      </span>
                      {u.streak > 0 && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-chart-3" />
                          {u.streak} дн.
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {u.level === "advanced" ? "Продв." : u.level === "intermediate" ? "Средн." : "Нач."}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.myRank === null && (
        <div className="text-center text-sm text-muted-foreground">
          <Crown className="h-5 w-5 mx-auto mb-1 text-chart-2" />
          Пройдите уроки, чтобы попасть в рейтинг!
        </div>
      )}
    </div>
  );
}
