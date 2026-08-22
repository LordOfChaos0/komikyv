# Worklog — Платформа изучения коми языка «Коми кыв»

## Project Overview
Рекреация интерактивной веб-платформы «Коми кыв» (изучение коми языка) на стеке Next.js 16 + TypeScript + Prisma/SQLite + shadcn/ui.

Источник требований:
- `/home/z/my-project/upload/коми кыв.txt` — описание темы практики, ТЗ, бизнес-процессы
- `/home/z/my-project/upload/Критерии.txt` — SRS-критерии (минимальный и рекомендуемый уровни)
- `/home/z/my-project/upload/full_context_20260819_155222.md` — выгрузка существующего Python/FastAPI + React проекта (используется как референс предметной области и БД-схемы)

Целевой стек (sandbox):
- Next.js 16 (App Router), единственный пользовательский маршрут — `/` (SPA с внутренним роутингом через Zustand)
- Prisma + SQLite, API routes под `/api/*`
- shadcn/ui (New York), Tailwind CSS 4, Lucide icons
- z-ai-web-dev-sdk для AI-скиллов (LLM диалоговый тренажёр, TTS произношение коми слов, ASR анализ произношения)

## Architecture Plan
Single-page application at `/` with view-state navigation. RBAC: guest / student / teacher / admin.

Entities (Prisma, 17 таблиц):
- User, StudentProfile (1:1)
- Category, Module, ModuleCategory (M:N)
- Lesson (1:N Module), Exercise (1:N Lesson), Vocabulary (1:N Lesson)
- Achievement, UserAchievement (M:N)
- LessonProgress (User × Lesson)
- DialogScenario, DialogSession
- ModerationLog, AuthLog, AuditLog, MediaFile

## Current Status
- **Phase 1 (Foundation)**: in progress
- Dev server running on port 3000
- Prisma schema being written

---
Task ID: ALL (1-11)
Agent: Main (Z.ai Code orchestrator)
Task: Реализовать платформу «Коми кыв» на Next.js 16 + Prisma/SQLite (рекреация существующего Python/FastAPI проекта в стеке sandbox)

Work Log:
- Спроектирована Prisma-схема: 17 таблиц (User, StudentProfile, Category, Module, ModuleCategory, Lesson, Exercise, Vocabulary, Achievement, UserAchievement, LessonProgress, DialogScenario, DialogSession, ModerationLog, AuthLog, AuditLog, MediaFile) с FK, индексами, soft-delete.
- Реализована auth-библиотека на Node built-in crypto: scrypt hashing, JWT (HS256) stateless sessions в HTTP-only cookie, RBAC (guest/student/teacher/admin).
- Созданы API-routes: auth (register/login/logout/me), modules (list/detail with filters, search, pagination), lessons/[id] (скрывает правильные ответы для студентов, проверяет unlock), exercises/[id]/check (проверка ответов для choice/translation/fill_blank/matching/audio), progress (submit с начислением XP, streak, level, achievements), vocabulary (search/filter/pagination), achievements, categories, leaderboard, dialog (scenarios/message с LLM/finish), tts, asr, teacher/modules + nested CRUD, admin/dashboard/moderation/users, seed.
- Написан seed-скрипт с 4 модулями, 8 уроками, 34 упражнениями, 84 словами коми, 12 достижениями, 4 диалоговыми сценариями, 3 пользователями (admin/teacher/student).
- Интегрированы AI Skills (z-ai-web-dev-sdk): TTS для озвучки коми слов (WAV, кэш в БД), LLM для диалогового тренажёра (системный промпт + сценарий + история), ASR для распознавания речи (с Levenshtein-оценкой произношения).
- Создан SPA shell: AppShell с sidebar (desktop) + Sheet (mobile), навигация через Zustand store (view + params + history), темой с акцентами коми орнамента (лесной зелёный + шафран + ржавый).
- Реализованы все view-компоненты: HomeView (hero, features, featured modules, dashboard для залогиненных), LoginView, RegisterView (с consent 152-ФЗ), AboutView (правовое соответствие), ModulesView (каталог с фильтрами + module detail с lesson unlock), LessonView (теория + упражнения всех типов + результат), DialogView (chat UI с LLM + TTS playback), VocabularyView (поиск + TTS), ProgressView (XP/level/streak + chart), AchievementsView (по категориям), LeaderboardView (подиум + список), ProfileView, TeacherModulesView + TeacherModuleEditView (CRUD уроков, словаря, упражнений), AdminDashboardView (графики регистраций/активности), AdminModerationView (модерация модулей), AdminUsersView (управление ролями).
- Bugfix во время разработки: исправлен модуль-detail API (не возвращал unlocked для уроков), исправлена TTS API (response_format wav вместо mp3), исправлен ASR API (file_base64 вместо file), исправлены lint-ошибки (no-assign-module-variable, useState в условных ветвлениях, setState в useEffect).
- Проверка agent-browser: home/modules/lesson player/vocabulary/leaderboard/progress/admin dashboard/dialog trainer — всё работает. LLM отвечает на коми, TTS озвучивает, навигация работает, footer прилипает к низу.

Stage Summary:
- ✅ Платформа полностью функциональна: 4 модуля, 8 уроков, 34 упражнения, 84 слова, 12 достижений, 4 диалога, 3 роли (student/teacher/admin).
- ✅ AI Skills интегрированы и работают: TTS (WAV), LLM (диалог на коми с грамматической обратной связью), ASR (распознавание речи).
- ✅ Lint чистый, dev server работает, все API routes возвращают 200.
- ✅ RBAC + JWT + soft delete + audit logs соответствуют 152-ФЗ.
- ⚠️ TTS использует голос "tongtong" (китайский) — нейросеть не обучена коми, но озвучивает текст фонетически. Для качественного произношения нужен fine-tuning или носитель.
- ⚠️ ASR возвращает транскрипцию на основе услышанного (модель не специалируется на коми), accuracy метрика через Levenshtein.
- Next: cron-job каждые 15 минут для QA + добавления новых фич.
