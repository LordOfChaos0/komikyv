"use client";

import { useState } from "react";
import { useNav } from "@/lib/nav-store";
import { useAuth } from "@/lib/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

export function RegisterView() {
  const { navigate } = useNav();
  const refresh = useAuth((s) => s.refresh);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "student" as "student" | "teacher",
    consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const data = await apiFetch<{ user: any; emailVerification?: any }>("/api/auth/register", {
        method: "POST",
        json: form,
      });
      // Check if email verification was sent
      if (data.emailVerification?.sent) {
        toast.success(`Аккаунт создан! Код подтверждения отправлен на ${form.email}`);
      } else if (data.emailVerification?.devCode) {
        toast.success(`Аккаунт создан! Код подтверждения: ${data.emailVerification.devCode}`);
      } else {
        toast.success(`Аккаунт создан! Добро пожаловать, ${data.user.fullName || data.user.email}`);
      }
      await refresh();
      navigate("home");
    } catch (e: any) {
      if (e.status === 400 && e.data?.details) {
        const fieldErrors: Record<string, string> = {};
        for (const k of Object.keys(e.data.details.fieldErrors || {})) {
          fieldErrors[k] = e.data.details.fieldErrors[k][0];
        }
        setErrors(fieldErrors);
      } else if (e.status === 409) {
        setErrors({ email: "Пользователь с таким email уже существует" });
      } else {
        toast.error(e.message || "Не удалось зарегистрироваться");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-1 text-primary-foreground">
            <UserPlus className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт для изучения коми языка</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">ФИО / отображаемое имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="pl-9"
                  placeholder="Иван Иванов"
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-9"
                  placeholder="минимум 6 символов"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label>Я регистрируюсь как</Label>
              <RadioGroup
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as any })}
                className="grid grid-cols-2 gap-2"
              >
                <label
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.role === "student" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value="student" />
                  <span className="text-sm font-medium">Ученик</span>
                </label>
                <label
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.role === "teacher" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem value="teacher" />
                  <span className="text-sm font-medium">Преподаватель</span>
                </label>
              </RadioGroup>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={form.consent}
                onCheckedChange={(v) => setForm({ ...form, consent: v === true })}
                id="consent"
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Я даю согласие на обработку персональных данных в соответствии
                с Федеральным законом № 152-ФЗ «О персональных данных»
              </span>
            </label>
            {errors.consent && <p className="text-xs text-destructive -mt-2">{errors.consent}</p>}

            <Button type="submit" className="w-full" disabled={loading || !form.consent}>
              {loading ? "Создание..." : "Создать аккаунт"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <button
              onClick={() => navigate("login")}
              className="text-primary font-medium hover:underline"
            >
              Войти
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
