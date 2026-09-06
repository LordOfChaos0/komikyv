"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// «Удаление аккаунта» — опасная зона в настройках (152-ФЗ:
// пользователь вправе отозвать согласие и удалить ПД).
// Подтверждение: пароль + чекбокс необратимости.
// ============================================================

export function DeleteAccountCard() {
  const { user, setUser } = useAuth();
  const { navigate } = useNav();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (payload: { password: string; confirmed: boolean }) =>
      apiFetch<{ ok: boolean }>("/api/auth/account", {
        method: "DELETE",
        json: payload,
      }),
    onSuccess: () => {
      setOpen(false);
      setUser(null);
      toast.success("Аккаунт удалён. Персональные данные анонимизированы (152-ФЗ).");
      navigate("home");
    },
    onError: (e: any) => {
      // 401 — неверный пароль: показываем у поля, остальное — toast
      if (e.status === 401) {
        setError(e.message || "Неверный пароль");
      } else {
        setError(e.message || "Не удалось удалить аккаунт");
      }
    },
  });

  const submit = () => {
    if (!password) {
      setError("Введите пароль для подтверждения");
      return;
    }
    if (!confirmed) {
      setError("Подтвердите, что понимаете необратимость удаления");
      return;
    }
    setError(null);
    deleteMutation.mutate({ password, confirmed: true });
  };

  const resetAndClose = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setPassword("");
      setConfirmed(false);
      setError(null);
    }
  };

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Удаление аккаунта
          </CardTitle>
          <CardDescription>
            Необратимо удалите аккаунт и персональные данные — как предусмотрено 152-ФЗ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Trash2 className="h-4 w-4 text-destructive shrink-0" />
              Что будет удалено
            </div>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Email, имя и пароль будут обезличены безвозвратно</li>
              <li>Двухфакторная аутентификация и привязанные секреты отключены</li>
              <li>Уведомления и личные заметки в избранном удалены</li>
              <li>Вход в аккаунт станет невозможен, email освободится для новой регистрации</li>
            </ul>
            <div className="flex items-center gap-2 font-medium pt-1">
              <ShieldCheck className="h-4 w-4 text-chart-1 shrink-0" />
              Что сохраняется (обезличенным)
            </div>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Агрегированная статистика платформы: XP, прогресс уроков, SRS</li>
              <li>Аудит-записи безопасности (без персональных данных)</li>
            </ul>
          </div>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить мой аккаунт
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={open} onOpenChange={resetAndClose}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Удалить аккаунт навсегда?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Аккаунт <span className="font-medium text-foreground">{user?.email}</span> будет
                  удалён вместе с персональными данными. Это действие{" "}
                  <span className="font-medium text-destructive">необратимо</span> — восстановить
                  аккаунт, прогресс и достижения будет невозможно.
                </p>
                <p className="text-xs">
                  Для подтверждения введите текущий пароль — это защищает аккаунт от удаления,
                  если доступ к браузеру получен посторонним.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Пароль</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                placeholder="Введите текущий пароль"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <label
              htmlFor="delete-confirm"
              className="flex items-start gap-2 text-sm cursor-pointer select-none"
            >
              <Checkbox
                id="delete-confirm"
                checked={confirmed}
                onCheckedChange={(v) => {
                  setConfirmed(v === true);
                  setError(null);
                }}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                Я понимаю, что удаление необратимо, и подтверждаю{" "}
                <span className="text-foreground font-medium">согласие на удаление персональных данных</span>
              </span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resetAndClose(false)}>
              Отмена
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={submit}
              disabled={deleteMutation.isPending || !password || !confirmed}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить аккаунт навсегда
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
