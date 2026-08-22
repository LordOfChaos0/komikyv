"use client";

import { AppShell } from "@/components/app-shell";
import { useNav } from "@/lib/nav-store";
import { useAuth } from "@/lib/auth-store";
import { HomeView } from "@/components/views/home-view";
import { LoginView } from "@/components/views/login-view";
import { RegisterView } from "@/components/views/register-view";
import { ModulesView } from "@/components/views/modules-view";
import { LessonView } from "@/components/views/lesson-view";
import { DialogView } from "@/components/views/dialog-view";
import { FlashcardsView } from "@/components/views/flashcards-view";
import { PronunciationView } from "@/components/views/pronunciation-view";
import { ListeningView } from "@/components/views/listening-view";
import { GrammarView } from "@/components/views/grammar-view";
import { AlphabetView } from "@/components/views/alphabet-view";
import { QuizView } from "@/components/views/quiz-view";
import { FavoritesView } from "@/components/views/favorites-view";
import { NotificationsView } from "@/components/views/notifications-view";
import { SettingsView } from "@/components/views/settings-view";
import { VocabularyView } from "@/components/views/vocabulary-view";
import { ProgressView } from "@/components/views/progress-view";
import { AchievementsView } from "@/components/views/achievements-view";
import { LeaderboardView } from "@/components/views/leaderboard-view";
import { ProfileView } from "@/components/views/profile-view";
import { TeacherModulesView } from "@/components/views/teacher/teacher-modules-view";
import { TeacherModuleEditView } from "@/components/views/teacher/teacher-module-edit-view";
import { AdminDashboardView } from "@/components/views/admin/admin-dashboard-view";
import { AdminModerationView } from "@/components/views/admin/admin-moderation-view";
import { AdminUsersView } from "@/components/views/admin/admin-users-view";
import { AboutView } from "@/components/views/about-view";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { view } = useNav();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  // Protected views
  const protectedViews = ["lesson", "dialog", "flashcards", "pronunciation", "listening", "favorites", "notifications", "settings", "quiz", "progress", "achievements", "leaderboard", "profile", "teacher-modules", "teacher-module-edit", "admin-dashboard", "admin-moderation", "admin-users"];
  if (protectedViews.includes(view) && !user) {
    return (
      <AppShell>
        <LoginView />
      </AppShell>
    );
  }

  const roleRestricted: Record<string, string[]> = {
    "teacher-modules": ["teacher", "admin"],
    "teacher-module-edit": ["teacher", "admin"],
    "admin-dashboard": ["admin"],
    "admin-moderation": ["admin"],
    "admin-users": ["admin"],
  };
  const restricted = roleRestricted[view];
  if (restricted && (!user || !restricted.includes(user.role))) {
    return (
      <AppShell>
        <HomeView />
      </AppShell>
    );
  }

  let content: React.ReactNode;
  switch (view) {
    case "home":
      content = <HomeView />;
      break;
    case "login":
      content = <LoginView />;
      break;
    case "register":
      content = <RegisterView />;
      break;
    case "modules":
      content = <ModulesView />;
      break;
    case "lesson":
      content = <LessonView />;
      break;
    case "dialog":
      content = <DialogView />;
      break;
    case "flashcards":
      content = <FlashcardsView />;
      break;
    case "pronunciation":
      content = <PronunciationView />;
      break;
    case "listening":
      content = <ListeningView />;
      break;
    case "vocabulary":
      content = <VocabularyView />;
      break;
    case "grammar":
      content = <GrammarView />;
      break;
    case "alphabet":
      content = <AlphabetView />;
      break;
    case "quiz":
      content = <QuizView />;
      break;
    case "favorites":
      content = <FavoritesView />;
      break;
    case "notifications":
      content = <NotificationsView />;
      break;
    case "settings":
      content = <SettingsView />;
      break;
    case "progress":
      content = <ProgressView />;
      break;
    case "achievements":
      content = <AchievementsView />;
      break;
    case "leaderboard":
      content = <LeaderboardView />;
      break;
    case "profile":
      content = <ProfileView />;
      break;
    case "teacher-modules":
      content = <TeacherModulesView />;
      break;
    case "teacher-module-edit":
      content = <TeacherModuleEditView />;
      break;
    case "admin-dashboard":
      content = <AdminDashboardView />;
      break;
    case "admin-moderation":
      content = <AdminModerationView />;
      break;
    case "admin-users":
      content = <AdminUsersView />;
      break;
    case "about":
      content = <AboutView />;
      break;
    default:
      content = <HomeView />;
  }

  return <AppShell>{content}</AppShell>;
}
