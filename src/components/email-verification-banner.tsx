"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MailCheck,
  MailWarning,
  Loader2,
  Check,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const queryClient = useQueryClient();
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  // Check verification status
  const { data: verifyStatus } = useQuery({
    queryKey: ["email-verify-status"],
    queryFn: () => apiFetch<{ email: string; emailVerified: boolean; hasPendingCode: boolean }>("/api/auth/verify-email"),
    refetchInterval: 10000,
  });

  const resendMutation = useMutation({
    mutationFn: () => apiFetch<any>("/api/auth/resend-verification", { method: "POST" }),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success(data.message || `Код отправлен на ${verifyStatus?.email}`);
        setDevCode(null);
      } else {
        // Dev mode — show code in UI
        setDevCode(data.devCode);
        toast.info(data.message || "Код показан в UI (dev-режим)");
      }
      queryClient.invalidateQueries({ queryKey: ["email-verify-status"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiFetch<any>("/api/auth/verify-email", {
        method: "POST",
        json: { code },
      }),
    onSuccess: (data) => {
      if (data.verified || data.alreadyVerified) {
        toast.success(data.message || "Email подтверждён!");
        setShowVerifyForm(false);
        setCode("");
        setDevCode(null);
        queryClient.invalidateQueries({ queryKey: ["email-verify-status"] });
        queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      }
    },
    onError: (e: any) => toast.error(e.message || "Неверный код"),
  });

  // Don't show if already verified or no data
  if (!verifyStatus || verifyStatus.emailVerified) return null;

  return (
    <Card className="border-chart-2/40 bg-chart-2/5 mb-4 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2 shrink-0">
            <MailWarning className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Email не подтверждён
              <Badge variant="outline" className="text-xs text-chart-2">
                {verifyStatus.email}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Подтвердите email для полного доступа к платформе.
            </p>

            {/* Verify form */}
            {showVerifyForm ? (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-значный код"
                    maxLength={6}
                    className="text-center text-lg tracking-widest font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && code.length === 6) verifyMutation.mutate();
                    }}
                  />
                  <Button
                    onClick={() => verifyMutation.mutate()}
                    disabled={code.length !== 6 || verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setShowVerifyForm(false); setCode(""); setDevCode(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Dev mode code display */}
                {devCode && (
                  <div className="p-2 rounded-lg bg-chart-1/10 border border-chart-1/20 text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      Код подтверждения (dev-режим):
                    </div>
                    <div className="text-2xl font-bold tracking-widest text-chart-1 font-mono">
                      {devCode}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Отправить код повторно
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setShowVerifyForm(true);
                    // Auto-send code if no pending code
                    if (!verifyStatus.hasPendingCode) {
                      resendMutation.mutate();
                    }
                  }}
                >
                  <MailCheck className="h-4 w-4 mr-1" />
                  Подтвердить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Отправить код
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
