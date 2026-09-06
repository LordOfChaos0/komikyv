"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, Search, Shield, Zap, Flame, BookOpen, MessageCircle, ChevronLeft, ChevronRight,
  KeyRound, Copy, Check, Trash2, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

export function AdminUsersView() {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);

  // Диалог подтверждения удаления профиля (REC 4.2)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    email: string;
    fullName: string | null;
    role: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Диалог результата сброса пароля (REC 4.2)
  const [resetResult, setResetResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const queryParams = new URLSearchParams({ pageSize: "20", page: String(page) });
  if (q) queryParams.set("q", q);
  if (role !== "all") queryParams.set("role", role);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", queryParams.toString()],
    queryFn: () => apiFetch<any>(`/api/admin/users?${queryParams.toString()}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }: any) =>
      apiFetch("/api/admin/users", { method: "PUT", json: { id, ...rest } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Пользователь обновлён");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Ручной сброс пароля (REC 4.2)
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ password: string; email: string }>(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      setResetResult({ email: data.email, password: data.password });
      setCopied(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
      toast.success("Пароль скопирован в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать — выделите пароль вручную");
    }
  };

  // Удаление профиля администратором (soft delete + анонимизация)
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteTarget(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Пользователь удалён, данные анонимизированы");
    },
    onError: (e: any) => setDeleteError(e.message || "Не удалось удалить пользователя"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Пользователи
        </h1>
        <p className="text-muted-foreground mt-1">
          Управление учётными записями и ролями
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Поиск по имени или email..."
            className="pl-9"
          />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="student">Ученики</SelectItem>
            <SelectItem value="teacher">Преподаватели</SelectItem>
            <SelectItem value="admin">Администраторы</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : data && data.items.length > 0 ? (
            <div className="divide-y divide-border">
              {data.items.map((u: any) => (
                <div key={u.id} className="flex items-start sm:items-center gap-3 p-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {(u.fullName || u.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{u.fullName || "Без имени"}</div>
                      {!u.isActive && <Badge variant="secondary" className="text-chart-3">Заблокирован</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-chart-2" />{u.profile?.xp || 0} XP</span>
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-chart-3" />{u.profile?.currentStreak || 0} дн.</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{u.stats.lessonsCompleted}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{u.stats.dialogSessions}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Select
                      value={u.role}
                      onValueChange={(v) => updateMutation.mutate({ id: u.id, role: v })}
                    >
                      <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Ученик</SelectItem>
                        <SelectItem value="teacher">Преподаватель</SelectItem>
                        <SelectItem value="admin">Администратор</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetPasswordMutation.mutate(u.id)}
                      disabled={resetPasswordMutation.isPending}
                      className="h-8"
                      title="Сбросить пароль и получить новый"
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1" />
                      {resetPasswordMutation.isPending ? "..." : "Пароль"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isActive ? "outline" : "default"}
                      onClick={() => updateMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      disabled={updateMutation.isPending}
                      className="h-8"
                    >
                      {u.isActive ? "Заблокировать" : "Разблокировать"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget({ id: u.id, email: u.email, fullName: u.fullName, role: u.role });
                      }}
                      disabled={deleteUserMutation.isPending || u.id === currentAdmin?.id}
                      className="h-8"
                      title={
                        u.id === currentAdmin?.id
                          ? "Нельзя удалить свой аккаунт из админ-панели — используйте Настройки"
                          : "Удалить профиль безвозвратно (soft delete + анонимизация)"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Пользователи не найдены</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог с результатом сброса пароля */}
      <Dialog open={!!resetResult} onOpenChange={(o) => !o && setResetResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Новый пароль
            </DialogTitle>
            <DialogDescription>
              Пароль для <span className="font-medium text-foreground">{resetResult?.email}</span>{" "}
              сброшен. Новый пароль показан только один раз — передайте его пользователю.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 rounded-lg bg-muted/60 border border-border font-mono text-sm tracking-wide break-all select-all">
              {resetResult?.password}
            </code>
            <Button size="icon" variant="outline" onClick={copyPassword} title="Копировать">
              {copied ? <Check className="h-4 w-4 text-chart-1" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Готово</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления профиля (REC 4.2, 152-ФЗ) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Удалить пользователя?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>
                  Профиль{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget?.fullName || deleteTarget?.email}
                  </span>{" "}
                  будет удалён (soft delete): персональные данные — email, имя, пароль, 2FA —
                  будут анонимизированы по 152-ФЗ, вход в аккаунт станет невозможен.
                  Агрегированная статистика сохранится в обезличенном виде.
                </p>
                <p className="text-xs text-muted-foreground">
                  Действие фиксируется в журнале аудита. Восстановить аккаунт нельзя —
                  при необходимости пользователь сможет зарегистрироваться заново.
                </p>
                {deleteError && (
                  <p className="text-xs text-destructive">{deleteError}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              Отмена
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить профиль
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
