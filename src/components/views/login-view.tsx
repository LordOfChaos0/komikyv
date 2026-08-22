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
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export function LoginView() {
  const { navigate } = useNav();
  const refresh = useAuth((s) => s.refresh);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const data = await apiFetch<{ user: any }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      toast.success(`Добро пожаловать, ${data.user.fullName || data.user.email}!`);
      await refresh();
      navigate("home");
    } catch (e: any) {
      if (e.status === 401) {
        setErrors({ password: "Неверный email или пароль" });
      } else {
        toast.error(e.message || "Не удалось войти");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: "student" | "teacher" | "admin") => {
    const creds = {
      student: { email: "student@komikyv.ru", password: "Student123!" },
      teacher: { email: "teacher@komikyv.ru", password: "Teacher123!" },
      admin: { email: "admin@komikyv.ru", password: "Admin123!" },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-3 text-primary-foreground">
            <LogIn className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Вход в систему</CardTitle>
          <CardDescription>Войдите, чтобы продолжить обучение</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Быстрый вход под демо-аккаунтом:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => fillDemo("student")}>
                Ученик
              </Button>
              <Button size="sm" variant="outline" onClick={() => fillDemo("teacher")}>
                Препод.
              </Button>
              <Button size="sm" variant="outline" onClick={() => fillDemo("admin")}>
                Админ
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <button
              onClick={() => navigate("register")}
              className="text-primary font-medium hover:underline"
            >
              Зарегистрироваться
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
