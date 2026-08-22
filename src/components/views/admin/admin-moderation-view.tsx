"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Shield, CheckCircle2, XCircle, RotateCcw, Clock, BookOpen, User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useNav } from "@/lib/nav-store";

export function AdminModerationView() {
  const queryClient = useQueryClient();
  const { navigate } = useNav();
  const [status, setStatus] = useState("on_moderation");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-moderation", status],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/admin/moderation?status=${status}`),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ moduleId, action, comment }: any) =>
      apiFetch("/api/admin/moderation", { method: "POST", json: { moduleId, action, comment } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Действие выполнено");
      setRejectTarget(null);
      setRejectComment("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          Модерация контента
        </h1>
        <p className="text-muted-foreground mt-1">
          Проверка и публикация учебных модулей
        </p>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="on_moderation">На модерации</SelectItem>
          <SelectItem value="draft">Черновики</SelectItem>
          <SelectItem value="published">Опубликованные</SelectItem>
          <SelectItem value="rejected">Отклонённые</SelectItem>
          <SelectItem value="archived">Архив</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{m.title}</h3>
                      <Badge variant="outline">{m.level}</Badge>
                      <Badge variant="secondary">{m.lessonsCount} уроков</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{m.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {m.author?.fullName || m.author?.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.updatedAt).toLocaleDateString("ru-RU")}
                      </span>
                      <button
                        onClick={() => navigate("modules", { selectedModuleId: m.id })}
                        className="text-primary hover:underline"
                      >
                        Просмотр →
                      </button>
                    </div>
                    {m.moderationLogs?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                        Последнее действие: {m.moderationLogs[0].action} от{" "}
                        {m.moderationLogs[0].admin?.fullName || "—"}
                        {m.moderationLogs[0].comment && ` — ${m.moderationLogs[0].comment}`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 min-w-[140px]">
                    {m.status === "on_moderation" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-chart-1 hover:bg-chart-1/90"
                          onClick={() => moderateMutation.mutate({ moduleId: m.id, action: "approve" })}
                          disabled={moderateMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Одобрить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-chart-3 text-chart-3 hover:bg-chart-3/5"
                          onClick={() => setRejectTarget(m.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Отклонить
                        </Button>
                      </>
                    )}
                    {m.status === "published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moderateMutation.mutate({ moduleId: m.id, action: "archive" })}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        В архив
                      </Button>
                    )}
                    {m.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moderateMutation.mutate({ moduleId: m.id, action: "request_changes" })}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Вернуть автору
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Модулей со статусом «{status}» не найдено</p>
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить модуль</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Комментарий для автора</Label>
              <Textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Укажите, что нужно исправить..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-chart-3 text-chart-3 hover:bg-chart-3/5"
                onClick={() => moderateMutation.mutate({ moduleId: rejectTarget, action: "reject", comment: rejectComment })}
                disabled={moderateMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Отклонить
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => moderateMutation.mutate({ moduleId: rejectTarget, action: "request_changes", comment: rejectComment })}
                disabled={moderateMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                На доработку
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
