"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useNav, type ViewName } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  BellOff,
} from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function NotificationsView() {
  const queryClient = useQueryClient();
  const { navigate } = useNav();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () =>
      apiFetch<{ items: any[]; unreadCount: number; totalCount: number }>(
        `/api/notifications?filter=${filter}`
      ),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: "PATCH", json: { isRead: true } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch("/api/notifications/mark-all-read", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Все уведомления отмечены как прочитанные");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Уведомление удалено");
    },
  });

  const handleClick = (notif: any) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    if (notif.link) {
      try {
        const params = notif.linkParams ? JSON.parse(notif.linkParams) : undefined;
        navigate(notif.link as ViewName, params);
      } catch {
        navigate(notif.link as ViewName);
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Уведомления
          </h1>
          <p className="text-muted-foreground mt-1">
            {data?.unreadCount ? `${data.unreadCount} непрочитанных` : "Все уведомления прочитаны"} · всего {data?.totalCount || 0}
          </p>
        </div>
        {data && data.unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Отметить все
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "Все" : "Непрочитанные"}
            {f === "unread" && data?.unreadCount ? ` (${data.unreadCount})` : ""}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-5 skeleton-shimmer rounded w-1/2" />
                <div className="h-3 skeleton-shimmer rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((notif, i) => {
            const Icon = (Icons as any)[notif.icon] || Bell;
            return (
              <Card
                key={notif.id}
                className={`transition-all hover:shadow-md cursor-pointer animate-fade-in ${
                  !notif.isRead ? "border-primary/40 bg-primary/5" : "opacity-80 hover:opacity-100"
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => handleClick(notif)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${notif.color || "primary"}/10 text-${notif.color || "primary"} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{notif.title}</h3>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {typeLabel(notif.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="text-xs text-muted-foreground mt-2">
                        {formatRelative(notif.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!notif.isRead && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(notif.id);
                          }}
                          title="Отметить прочитанным"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notif.id);
                        }}
                        title="Удалить"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {filter === "unread" ? (
              <>
                <BellOff className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Нет непрочитанных уведомлений</p>
                <p className="text-sm mt-1">Вы в курсе всех событий!</p>
              </>
            ) : (
              <>
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Пока нет уведомлений</p>
                <p className="text-sm mt-1">Здесь появятся новости о ваших достижениях и активности.</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    achievement: "Достижение",
    streak: "Серия",
    level_up: "Уровень",
    lesson_completed: "Урок",
    dialog_completed: "Диалог",
    system: "Система",
    welcome: "Приветствие",
  };
  return map[type] || type;
}

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return "только что";
  if (min < 60) return `${min} мин. назад`;
  if (hour < 24) return `${hour} ч. назад`;
  if (day === 1) return "вчера";
  if (day < 7) return `${day} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
