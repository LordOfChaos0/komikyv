"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldOff, Loader2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";

// ============================================================
// Карточка «Безопасность»: управление двухфакторной
// аутентификацией (TOTP, RFC 6238) — Google Authenticator,
// Yandex Key и другие приложения-аутентификаторы.
// Для администраторов 2FA обязательна для работы редактора БД.
// ============================================================

export function SecurityCard() {
  const queryClient = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const isAdmin = role === "admin";

  const { data: status, isLoading } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => apiFetch<{ enabled: boolean; hasPendingSecret: boolean }>("/api/auth/2fa/status"),
  });

  // Диалог включения
  const [enableOpen, setEnableOpen] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string; qrSvg: string | null } | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Диалог отключения
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  const startSetup = async () => {
    setSetupLoading(true);
    setEnableCode("");
    try {
      const data = await apiFetch<{ secret: string; otpauthUrl: string; qrSvg: string | null }>(
        "/api/auth/2fa/setup",
        { method: "POST" }
      );
      setSetup(data);
      setEnableOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Не удалось подготовить 2FA");
    } finally {
      setSetupLoading(false);
    }
  };

  const enableMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/auth/2fa/enable", { method: "POST", json: { code: enableCode } }),
    onSuccess: () => {
      toast.success("Двухфакторная аутентификация включена");
      setEnableOpen(false);
      setSetup(null);
      setEnableCode("");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (e: any) => toast.error(e.message || "Неверный код"),
  });

  const disableMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/auth/2fa/disable", {
        method: "POST",
        json: disableCode ? { code: disableCode } : { password: disablePassword },
      }),
    onSuccess: () => {
      toast.success("Двухфакторная аутентификация отключена");
      setDisableOpen(false);
      setDisableCode("");
      setDisablePassword("");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (e: any) => toast.error(e.message || "Не удалось отключить"),
  });

  const copySecret = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      toast.success("Секрет скопирован");
    } catch {
      toast.error("Скопируйте секрет вручную");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-chart-2" />
          Безопасность
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : status?.enabled ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">2FA включена</Badge>
          ) : (
            <Badge variant="secondary">2FA выключена</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Двухфакторная аутентификация: код из приложения-аутентификатора при каждом входе
          {isAdmin && " — обязательна для доступа к редактору базы данных"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status?.enabled ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Вход защищён одноразовыми кодами (TOTP). Для отключения потребуется код
              аутентификатора или текущий пароль.
            </p>
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              <ShieldOff className="h-4 w-4 mr-1" /> Отключить
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Добавьте второй фактор: отсканируйте QR-код приложением (Google Authenticator,
              Yandex Key, 1Password) и подтвердите код.
            </p>
            <Button onClick={startSetup} disabled={setupLoading}>
              {setupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              Включить 2FA
            </Button>
          </div>
        )}
      </CardContent>

      {/* Диалог включения: QR-код + секрет + код подтверждения */}
      <Dialog open={enableOpen} onOpenChange={(open) => { if (!open) { setEnableOpen(false); setSetup(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Подключение аутентификатора
            </DialogTitle>
            <DialogDescription>
              Отсканируйте QR-код приложением-аутентификатором или введите секрет вручную,
              затем подтвердите код.
            </DialogDescription>
          </DialogHeader>

          {setup && (
            <div className="space-y-4">
              <div className="flex justify-center p-3 bg-white rounded-lg border border-border">
                {setup.qrSvg ? (
                  <div
                    className="[&>svg]:w-44 [&>svg]:h-44"
                    dangerouslySetInnerHTML={{ __html: setup.qrSvg }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground max-w-[220px] text-center">
                    QR-код недоступен — добавьте секрет вручную (см. ниже)
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Секрет для ручного ввода</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded bg-muted font-mono text-xs break-all select-all">
                    {setup.secret}
                  </code>
                  <Button size="icon" variant="outline" onClick={copySecret} title="Копировать">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); enableMutation.mutate(); }}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="enable-code">Код из приложения</Label>
                  <Input
                    id="enable-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center font-mono text-lg tracking-[0.4em]"
                    autoFocus
                    required
                    autoComplete="one-time-code"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={enableMutation.isPending || enableCode.length !== 6}
                >
                  {enableMutation.isPending ? "Проверка..." : "Подтвердить и включить"}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог отключения: код или пароль */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Отключение 2FA
            </DialogTitle>
            <DialogDescription>
              Подтвердите действие кодом аутентификатора или текущим паролем.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); disableMutation.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="disable-code">Код аутентификатора</Label>
              <Input
                id="disable-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={disableCode}
                onChange={(e) => {
                  setDisableCode(e.target.value.replace(/\D/g, ""));
                  if (e.target.value) setDisablePassword("");
                }}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-[0.4em]"
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground uppercase">или</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-password">Текущий пароль</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => {
                  setDisablePassword(e.target.value);
                  if (e.target.value) setDisableCode("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={disableMutation.isPending || (!disableCode && !disablePassword)}>
                {disableMutation.isPending ? "Отключение..." : "Отключить 2FA"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
