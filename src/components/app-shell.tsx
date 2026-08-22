"use client";

import { useNav, type ViewName } from "@/lib/nav-store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  MessageCircle,
  Library,
  BarChart3,
  Trophy,
  Users,
  User as UserIcon,
  LogIn,
  LogOut,
  Shield,
  GraduationCap,
  Menu,
  Award,
  Sparkles,
  Layers,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useState } from "react";
import { toast } from "sonner";

interface NavItem {
  view: ViewName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // optional role restriction
}

const STUDENT_NAV: NavItem[] = [
  { view: "home", label: "Главная", icon: Home },
  { view: "modules", label: "Учебные модули", icon: BookOpen },
  { view: "flashcards", label: "Карточки слов", icon: Layers },
  { view: "pronunciation", label: "Произношение", icon: Mic },
  { view: "dialog", label: "Диалоговый тренажёр", icon: MessageCircle },
  { view: "vocabulary", label: "Словарь", icon: Library },
  { view: "progress", label: "Мой прогресс", icon: BarChart3 },
  { view: "achievements", label: "Достижения", icon: Trophy },
  { view: "leaderboard", label: "Рейтинг", icon: Users },
  { view: "about", label: "О платформе", icon: Sparkles },
];

const TEACHER_NAV: NavItem[] = [
  { view: "home", label: "Главная", icon: Home },
  { view: "modules", label: "Каталог", icon: BookOpen },
  { view: "flashcards", label: "Карточки", icon: Layers },
  { view: "pronunciation", label: "Произношение", icon: Mic },
  { view: "teacher-modules", label: "Мои модули", icon: GraduationCap, roles: ["teacher"] },
  { view: "vocabulary", label: "Словарь", icon: Library },
  { view: "dialog", label: "Тренажёр", icon: MessageCircle },
  { view: "progress", label: "Мой прогресс", icon: BarChart3 },
  { view: "achievements", label: "Достижения", icon: Trophy },
];

const ADMIN_NAV: NavItem[] = [
  { view: "home", label: "Главная", icon: Home },
  { view: "admin-dashboard", label: "Дашборд", icon: Shield, roles: ["admin"] },
  { view: "admin-moderation", label: "Модерация", icon: Award, roles: ["admin"] },
  { view: "admin-users", label: "Пользователи", icon: Users, roles: ["admin"] },
  { view: "modules", label: "Каталог", icon: BookOpen },
  { view: "flashcards", label: "Карточки", icon: Layers },
  { view: "pronunciation", label: "Произношение", icon: Mic },
  { view: "vocabulary", label: "Словарь", icon: Library },
  { view: "teacher-modules", label: "Конструктор", icon: GraduationCap, roles: ["admin"] },
  { view: "dialog", label: "Тренажёр", icon: MessageCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, navigate } = useNav();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    user?.role === "admin"
      ? ADMIN_NAV
      : user?.role === "teacher"
      ? TEACHER_NAV
      : STUDENT_NAV;

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "guest")
  );

  const handleLogout = async () => {
    await logout();
    toast.success("Вы вышли из аккаунта");
    navigate("home");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <button
        onClick={() => navigate("home")}
        className="flex items-center gap-3 px-4 py-5 hover:bg-sidebar-accent/50 transition-colors text-left"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-chart-3 text-primary-foreground shadow-md">
          <span className="text-xl font-bold tracking-tight">К</span>
        </div>
        <div>
          <div className="font-bold text-lg leading-tight">Коми кыв</div>
          <div className="text-xs text-muted-foreground">изучение коми языка</div>
        </div>
      </button>

      <div className="komi-divider mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                navigate(item.view);
                setMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="komi-divider mx-4" />

      {/* User block */}
      <div className="p-3">
        {user ? (
          <div className="space-y-2">
            <button
              onClick={() => navigate("profile")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
            >
              <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                  {(user.fullName || user.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.fullName || user.email}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {user.profile && (
                    <>
                      <span className="text-chart-2 font-semibold">{user.profile.xp} XP</span>
                      {user.profile.currentStreak > 0 && (
                        <span className="text-chart-3">🔥{user.profile.currentStreak}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs capitalize",
                  user.role === "admin" && "bg-chart-3/15 text-chart-3",
                  user.role === "teacher" && "bg-chart-2/15 text-chart-2",
                  user.role === "student" && "bg-chart-1/15 text-chart-1"
                )}
              >
                {user.role === "admin" ? "Администратор" : user.role === "teacher" ? "Преподаватель" : "Ученик"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-auto h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={() => navigate("login")}
              className="w-full"
              variant="default"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Войти
            </Button>
            <Button
              onClick={() => navigate("register")}
              className="w-full"
              variant="outline"
            >
              Регистрация
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-border bg-sidebar sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar (sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-sidebar/95 backdrop-blur border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-3 text-primary-foreground">
              <span className="font-bold text-sm">К</span>
            </div>
            <span className="font-bold">Коми кыв</span>
          </button>
        </header>

        <main className="flex-1 min-w-0">{children}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-sidebar/50">
      <div className="komi-divider" />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-chart-3 text-primary-foreground text-xs font-bold">
              К
            </div>
            <span>
              <span className="font-semibold text-foreground">Коми кыв</span> · Платформа изучения коми языка
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()}</span>
            <span className="hidden sm:inline">·</span>
            <span>Сохраняем язык народа коми</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
