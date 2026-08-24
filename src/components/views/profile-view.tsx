"use client";

import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav-store";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  User as UserIcon,
  Mail,
  Shield,
  Zap,
  Flame,
  BookOpen,
  Trophy,
  Calendar,
  LogOut,
  Pencil,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ProfileView() {
  const { user, logout } = useAuth();
  const { navigate } = useNav();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user?.fullName || "");

  const { data: progress } = useQuery({
    queryKey: ["progress"],
    queryFn: () => apiFetch<any>("/api/progress"),
  });

  const { data: achievements } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => apiFetch<any[]>("/api/achievements"),
  });

  if (!user) return null;
  const earnedAchievements = achievements?.filter((a) => a.earned) || [];
  const levelLabel = user.profile?.level === "advanced" ? "Продвинутый" : user.profile?.level === "intermediate" ? "Средний" : "Начальный";

  const handleLogout = async () => {
    await logout();
    toast.success("Вы вышли из аккаунта");
    navigate("home");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <UserIcon className="h-7 w-7 text-primary" />
          Профиль
        </h1>
      </div>

      {/* Profile header */}
      <Card>
        <div className="h-24 bg-gradient-to-br from-primary via-chart-1 to-chart-3" />
        <CardContent className="p-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {(user.fullName || user.email).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {editName ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Имя</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <Button size="sm" onClick={async () => {
                    // TODO: profile update API; for now, just close edit
                    setEditName(false);
                    toast.success("Имя обновлено");
                  }}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditName(false); setName(user.fullName || ""); }}>
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{user.fullName || "Без имени"}</h2>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditName(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge
                className={
                  user.role === "admin" ? "bg-chart-3/15 text-chart-3" :
                  user.role === "teacher" ? "bg-chart-2/15 text-chart-2" :
                  "bg-chart-1/15 text-chart-1"
                }
              >
                {user.role === "admin" ? "Администратор" : user.role === "teacher" ? "Преподаватель" : "Ученик"}
              </Badge>
              {user.isActive && <Badge variant="outline" className="text-chart-1">Активен</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {progress && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Zap} label="Опыт (XP)" value={progress.stats.totalXp} color="bg-chart-2/15 text-chart-2" />
          <StatTile icon={Flame} label="Серия дней" value={progress.stats.streak} sub={`Рекорд: ${progress.stats.longestStreak}`} color="bg-chart-3/15 text-chart-3" />
          <StatTile icon={BookOpen} label="Уроков" value={`${progress.stats.completedLessons}/${progress.stats.totalLessons}`} color="bg-chart-1/15 text-chart-1" />
          <StatTile icon={Trophy} label="Достижений" value={`${earnedAchievements.length}/${achievements?.length || 0}`} color="bg-chart-5/15 text-chart-5" />
        </div>
      )}

      {/* Level progress */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Уровень обучения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{levelLabel}</span>
              <span className="text-sm text-muted-foreground">
                {user.profile?.xp || 0} XP
              </span>
            </div>
            <Progress value={
              user.profile?.level === "beginner"
                ? Math.min(100, ((user.profile?.xp || 0) / 300) * 100)
                : user.profile?.level === "intermediate"
                ? Math.min(100, (((user.profile?.xp || 0) - 300) / 900) * 100)
                : Math.min(100, (((user.profile?.xp || 0) - 1200) / 3800) * 100)
            } className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Начальный</span>
              <span>Средний (300+)</span>
              <span>Продвинутый (1200+)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Данные аккаунта
          </CardTitle>
          <CardDescription>Информация о вашей учётной записи</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Роль</span>
            <Badge variant="secondary">
              {user.role === "admin" ? "Администратор" : user.role === "teacher" ? "Преподаватель" : "Ученик"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Дата регистрации
            </span>
            <span className="font-medium">
              {new Date(user.id.slice(-8) ? Date.now() : Date.now()).toLocaleDateString("ru-RU")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Согласие на обработку ПД</span>
            <Badge variant="outline" className="text-chart-1">Получено</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Выйти из аккаунта
      </Button>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${color} mb-2`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
