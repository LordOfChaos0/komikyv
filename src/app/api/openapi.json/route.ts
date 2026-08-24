import { NextResponse } from "next/server";

// ============================================================
// GET /api/openapi.json (REC 5.4)
// OpenAPI 3.0 спецификация платформы «Коми кыв».
// Рендерится Swagger UI на /api-docs.
// ============================================================

// Хелперы для компактного описания стандартных ответов
const ok = (desc: string) => ({ 200: { description: desc } });
const errs = (...codes: number[]) => {
  const map: Record<string, { description: string }> = {};
  if (codes.includes(400)) map["400"] = { description: "Ошибка валидации (Zod)" };
  if (codes.includes(401)) map["401"] = { description: "Не авторизован" };
  if (codes.includes(403)) map["403"] = { description: "Недостаточно прав / CSRF / админ-токен" };
  if (codes.includes(404)) map["404"] = { description: "Не найдено" };
  if (codes.includes(429)) map["429"] = { description: "Rate limit превышен" };
  return map;
};
const auth = [{ cookieAuth: [] }];
const pageParams = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 } },
  { name: "pageSize", in: "query", schema: { type: "integer", default: 9, maximum: 20 } },
];

export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Коми кыв — API платформы изучения коми языка",
      description:
        "REST API веб-платформы «Коми кыв». Аутентификация — JWT-сессия в httpOnly cookie `komi_session`. " +
        "Мутирующие запросы (POST/PUT/PATCH/DELETE) дополнительно защищены CSRF-токеном: заголовок `X-CSRF-Token` " +
        "должен совпадать с cookie `komi_csrf`. Чувствительные auth-эндпоинты ограничены rate-limit'ом. " +
        "При заданном ADMIN_ACCESS_TOKEN запросы к /api/admin/* требуют заголовок `X-Admin-Token`.",
      version: "1.0.0",
      contact: { name: "Коми кыв", email: "support@komikyv.ru" },
    },
    servers: [{ url: "/", description: "Текущий хост" }],
    tags: [
      { name: "Auth", description: "Аутентификация, регистрация, восстановление пароля, OAuth" },
      { name: "OAuth", description: "Вход через внешние сервисы (Яндекс ID)" },
      { name: "Modules", description: "Учебные модули и каталог" },
      { name: "Lessons", description: "Уроки и упражнения" },
      { name: "Progress", description: "Прогресс, XP, активность" },
      { name: "SRS", description: "Интервальные повторения (SM-2)" },
      { name: "Vocabulary", description: "Словарь коми языка" },
      { name: "Content", description: "Грамматика, алфавит, пословицы, сказки, аудирование, мини-тесты" },
      { name: "Dialog", description: "Диалоговый тренажёр с LLM" },
      { name: "AI", description: "AI-скиллы: TTS и ASR" },
      { name: "Favorites", description: "Избранные слова" },
      { name: "Notifications", description: "Уведомления" },
      { name: "Admin", description: "Административная панель (только admin)" },
      { name: "Teacher", description: "Интерфейс преподавателя (teacher/admin)" },
      { name: "System", description: "Служебные эндпоинты" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "komi_session",
          description: "JWT-сессия (выдаётся POST /api/auth/login)",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["student", "teacher", "admin"] },
            fullName: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            emailVerified: { type: "boolean" },
          },
        },
        Module: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
            status: { type: "string", enum: ["draft", "on_moderation", "published", "rejected", "archived"] },
            lessonsCount: { type: "integer" },
            progress: { type: "integer", description: "Процент завершения (0-100)" },
            estimatedMin: { type: "integer" },
          },
        },
        Lesson: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            contentJson: { type: "string", description: "Теория урока (JSON)" },
            unlocked: { type: "boolean", description: "Доступен ли урок (последовательное открытие)" },
            exercises: {
              type: "array",
              items: { $ref: "#/components/schemas/Exercise" },
            },
          },
        },
        Exercise: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["choice", "translation", "fill_blank", "matching", "audio"] },
            question: { type: "string" },
            questionRu: { type: "string", nullable: true },
            optionsJson: { type: "string", nullable: true },
            scoreWeight: { type: "number" },
          },
          description: "correctAnswer скрывается для студентов в GET /api/lessons/[id]",
        },
        VocabularyWord: {
          type: "object",
          properties: {
            id: { type: "string" },
            wordKomi: { type: "string" },
            translationRu: { type: "string" },
            transcription: { type: "string", nullable: true },
            partOfSpeech: { type: "string", nullable: true },
            exampleKomi: { type: "string", nullable: true },
            exampleRu: { type: "string", nullable: true },
          },
        },
        Paginated: {
          type: "object",
          properties: {
            items: { type: "array", items: {} },
            total: { type: "integer" },
            page: { type: "integer" },
            pageSize: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
    paths: {
      // ============ AUTH ============
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Регистрация нового пользователя",
          description: "Создаёт аккаунт (роль student), отправляет код подтверждения email. Требуется consent=true (152-ФЗ).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "fullName", "consent"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    fullName: { type: "string" },
                    consent: { type: "boolean", description: "Согласие на обработку ПД (152-ФЗ)" },
                  },
                },
              },
            },
          },
          responses: { ...ok("Аккаунт создан, код подтверждения отправлен"), ...errs(400, 429) },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Вход по email и паролю",
          description: "Проверяет учётные данные, выдаёт JWT в httpOnly cookie. Rate limit: 5 запросов/мин с IP.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { ...ok("JWT-сессия установлена"), ...errs(400, 401, 403, 429) },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Выход из системы",
          security: auth,
          responses: { ...ok("Cookie сессии очищена"), ...errs(403) },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Текущий пользователь с профилем",
          description: "Возвращает {user: null} для неавторизованных (SPA-паттерн).",
          security: auth,
          responses: ok("Пользователь + StudentProfile (xp, level, streak)"),
        },
      },
      "/api/auth/verify-email": {
        post: {
          tags: ["Auth"],
          summary: "Подтверждение email по коду",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "code"],
                  properties: { email: { type: "string" }, code: { type: "string" } },
                },
              },
            },
          },
          responses: { ...ok("emailVerified=true"), ...errs(400, 429) },
        },
      },
      "/api/auth/resend-verification": {
        post: {
          tags: ["Auth"],
          summary: "Повторная отправка кода подтверждения",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string" } },
                },
              },
            },
          },
          responses: { ...ok("Код отправлен"), ...errs(400, 429) },
        },
      },
      "/api/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Запрос кода восстановления пароля",
          description: "Всегда 200 (не раскрывает существование email). Rate limit: 3 запроса/мин.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: { ...ok("Код отправлен (если аккаунт существует)"), ...errs(400, 429) },
        },
      },
      "/api/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Установка нового пароля по коду из письма",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "code", "newPassword"],
                  properties: {
                    email: { type: "string", format: "email" },
                    code: { type: "string", minLength: 6, maxLength: 6 },
                    newPassword: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { ...ok("Пароль изменён"), ...errs(400, 429) },
        },
      },

      // ============ OAUTH ============
      "/api/auth/oauth/providers": {
        get: {
          tags: ["OAuth"],
          summary: "Список активированных OAuth-провайдеров",
          responses: ok("{providers: [\"yandex\"]} — только настроенные через env"),
        },
      },
      "/api/auth/oauth/yandex": {
        get: {
          tags: ["OAuth"],
          summary: "Редирект на авторизацию Яндекс ID",
          description: "Активен при заданных YANDEX_CLIENT_ID/YANDEX_CLIENT_SECRET. Иначе 501.",
          responses: { "302": { description: "Редирект на oauth.yandex.ru" }, "501": { description: "Провайдер не настроен" } },
        },
      },
      "/api/auth/oauth/yandex/callback": {
        get: {
          tags: ["OAuth"],
          summary: "Callback OAuth Яндекса",
          description: "Обмен кода на токен, автосоздание/поиск пользователя, установка сессии.",
          parameters: [
            { name: "code", in: "query", schema: { type: "string" } },
            { name: "state", in: "query", schema: { type: "string" } },
          ],
          responses: { "302": { description: "Редирект на / с установленной сессией" } },
        },
      },

      // ============ MODULES ============
      "/api/modules": {
        get: {
          tags: ["Modules"],
          summary: "Каталог опубликованных модулей",
          description: "Поиск (q), фильтр по level и category (slug), сортировка (newest/popular/az/level), пагинация.",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "Поиск по названию и описанию" },
            { name: "level", in: "query", schema: { type: "string", enum: ["beginner", "intermediate", "advanced"] } },
            { name: "category", in: "query", schema: { type: "string" }, description: "Slug категории" },
            { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "popular", "az", "level"] } },
            { name: "status", in: "query", schema: { type: "string" }, description: "mine — модули автора (teacher)" },
            ...pageParams,
          ],
          responses: ok("Paginated список модулей с прогрессом пользователя"),
        },
      },
      "/api/modules/{id}": {
        get: {
          tags: ["Modules"],
          summary: "Детали модуля с уроками",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Модуль + уроки с флагом unlocked"), ...errs(404) },
        },
      },
      "/api/categories": {
        get: {
          tags: ["Modules"],
          summary: "Список категорий",
          responses: ok("Категории (slug, name, color, icon)"),
        },
      },

      // ============ LESSONS ============
      "/api/lessons/{id}": {
        get: {
          tags: ["Lessons"],
          summary: "Урок с упражнениями",
          description: "Скрывает correctAnswer для студентов. Урок доступен только при завершении предыдущего.",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Урок + упражнения"), ...errs(403, 404) },
        },
      },
      "/api/exercises/{id}/check": {
        post: {
          tags: ["Lessons"],
          summary: "Проверка ответа на упражнение",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["answer"],
                  properties: { answer: { type: "string", description: "Ответ или JSON для matching" } },
                },
              },
            },
          },
          responses: { ...ok("{isCorrect, correctAnswer, feedback}"), ...errs(400, 401, 403) },
        },
      },

      // ============ PROGRESS ============
      "/api/progress": {
        get: {
          tags: ["Progress"],
          summary: "Прогресс пользователя",
          security: auth,
          responses: { ...ok("XP, level, streak, завершённые уроки, достижения"), ...errs(401) },
        },
      },
      "/api/progress/submit": {
        post: {
          tags: ["Progress"],
          summary: "Завершение урока (начисление XP)",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["lessonId", "answers"],
                  properties: {
                    lessonId: { type: "string" },
                    answers: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          responses: { ...ok("Начисленные XP, новые достижения"), ...errs(400, 401, 403) },
        },
      },
      "/api/activity": {
        get: {
          tags: ["Progress"],
          summary: "Журнал активности",
          security: auth,
          responses: { ...ok("События активности пользователя"), ...errs(401) },
        },
      },
      "/api/daily-progress": {
        get: {
          tags: ["Progress"],
          summary: "Прогресс дневной цели",
          security: auth,
          responses: { ...ok("Уроки/диалоги/SRS за сегодня"), ...errs(401) },
        },
      },
      "/api/achievements": {
        get: {
          tags: ["Progress"],
          summary: "Достижения (все + полученные)",
          responses: ok("12 достижений по категориям"),
        },
      },
      "/api/leaderboard": {
        get: {
          tags: ["Progress"],
          summary: "Рейтинг пользователей по XP",
          responses: ok("Топ пользователей"),
        },
      },
      "/api/word-of-day": {
        get: {
          tags: ["Content"],
          summary: "Слово дня",
          responses: ok("Случайное коми слово с переводом"),
        },
      },

      // ============ SRS ============
      "/api/srs/due": {
        get: {
          tags: ["SRS"],
          summary: "Карточки к повторению (SM-2)",
          security: auth,
          responses: { ...ok("Список карточек с интервалами"), ...errs(401) },
        },
      },
      "/api/srs/review": {
        post: {
          tags: ["SRS"],
          summary: "Оценка карточки (SM-2: 0-5)",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["vocabularyId", "quality"],
                  properties: {
                    vocabularyId: { type: "string" },
                    quality: { type: "integer", minimum: 0, maximum: 5 },
                  },
                },
              },
            },
          },
          responses: { ...ok("Следующий интервал повторения"), ...errs(400, 401, 403) },
        },
      },
      "/api/srs/stats": {
        get: {
          tags: ["SRS"],
          summary: "Статистика SRS",
          security: auth,
          responses: { ...ok("Изучено/в работе/к повторению"), ...errs(401) },
        },
      },

      // ============ VOCABULARY ============
      "/api/vocabulary": {
        get: {
          tags: ["Vocabulary"],
          summary: "Поиск по словарю",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "Поиск по коми слову и переводу" },
            { name: "lessonId", in: "query", schema: { type: "string" } },
            { name: "partOfSpeech", in: "query", schema: { type: "string" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["az_komi", "az_ru", "newest"] } },
            ...pageParams,
          ],
          responses: ok("Paginated словарь (84 слова)"),
        },
      },

      // ============ CONTENT ============
      "/api/grammar": {
        get: {
          tags: ["Content"],
          summary: "Грамматический справочник",
          responses: ok("Разделы: алфавит, фонетика, падежи, глаголы, синтаксис"),
        },
      },
      "/api/alphabet": {
        get: {
          tags: ["Content"],
          summary: "Интерактивный алфавит (35 букв)",
          responses: ok("Буквы с произношением и примерами"),
        },
      },
      "/api/proverbs": {
        get: {
          tags: ["Content"],
          summary: "Коми пословицы",
          responses: ok("Список пословиц с переводом"),
        },
      },
      "/api/folktales": {
        get: {
          tags: ["Content"],
          summary: "Коми сказки",
          responses: ok("Список сказок"),
        },
      },
      "/api/culture": {
        get: {
          tags: ["Content"],
          summary: "Материалы о культуре коми",
          responses: ok("Культурные материалы"),
        },
      },
      "/api/listening": {
        get: {
          tags: ["Content"],
          summary: "Упражнения на аудирование",
          security: auth,
          responses: { ...ok("Аудиозадания"), ...errs(401) },
        },
      },
      "/api/quiz": {
        get: {
          tags: ["Content"],
          summary: "Мини-тест (случайные упражнения)",
          security: auth,
          responses: { ...ok("Подборка упражнений"), ...errs(401) },
        },
      },

      // ============ DIALOG ============
      "/api/dialog/scenarios": {
        get: {
          tags: ["Dialog"],
          summary: "Сценарии диалогов",
          responses: ok("4 сценария + число попыток пользователя"),
        },
      },
      "/api/dialog/sessions": {
        get: {
          tags: ["Dialog"],
          summary: "История сессий диалогов",
          security: auth,
          responses: { ...ok("Сессии со статусами"), ...errs(401) },
        },
      },
      "/api/dialog/message": {
        post: {
          tags: ["Dialog"],
          summary: "Сообщение в LLM-тренажёр",
          description: "Ответ ИИ на коми языке с переводом [RU:] и грамматической обратной связью.",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    sessionId: { type: "string" },
                    scenarioId: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { ...ok("Ответ ИИ"), ...errs(400, 401, 403) },
        },
      },
      "/api/dialog/finish": {
        post: {
          tags: ["Dialog"],
          summary: "Завершение сессии диалога (начисление XP)",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sessionId"],
                  properties: { sessionId: { type: "string" } },
                },
              },
            },
          },
          responses: { ...ok("Итоги диалога + XP"), ...errs(400, 401, 403) },
        },
      },

      // ============ AI ============
      "/api/tts": {
        post: {
          tags: ["AI"],
          summary: "Синтез речи (TTS) для коми слов",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: {
                    text: { type: "string", maxLength: 300 },
                    voice: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { ...ok("Аудио (WAV/base64, кэшируется в БД)"), ...errs(400, 401, 403) },
        },
      },
      "/api/asr": {
        post: {
          tags: ["AI"],
          summary: "Распознавание речи (ASR) + оценка произношения",
          description: "Levenshtein-сравнение распознанной речи с целевым словом. Аудио не сохраняется (152-ФЗ).",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["audioBase64"],
                  properties: {
                    audioBase64: { type: "string" },
                    target: { type: "string", description: "Целевое коми слово" },
                  },
                },
              },
            },
          },
          responses: { ...ok("{transcript, accuracy, feedback}"), ...errs(400, 401, 403) },
        },
      },

      // ============ FAVORITES ============
      "/api/favorites": {
        get: {
          tags: ["Favorites"],
          summary: "Избранные слова пользователя",
          security: auth,
          responses: { ...ok("Список избранных"), ...errs(401) },
        },
        post: {
          tags: ["Favorites"],
          summary: "Добавить слово в избранное",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["vocabularyId"],
                  properties: { vocabularyId: { type: "string" } },
                },
              },
            },
          },
          responses: { ...ok("Добавлено"), ...errs(400, 401, 403) },
        },
      },
      "/api/favorites/{id}": {
        delete: {
          tags: ["Favorites"],
          summary: "Удалить из избранного",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Удалено"), ...errs(401, 403, 404) },
        },
      },

      // ============ NOTIFICATIONS ============
      "/api/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "Уведомления пользователя",
          security: auth,
          responses: { ...ok("Список + unreadCount"), ...errs(401) },
        },
      },
      "/api/notifications/{id}": {
        patch: {
          tags: ["Notifications"],
          summary: "Отметить уведомление прочитанным",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Обновлено"), ...errs(401, 403, 404) },
        },
      },
      "/api/notifications/mark-all-read": {
        post: {
          tags: ["Notifications"],
          summary: "Отметить все уведомления прочитанными",
          security: auth,
          responses: { ...ok("Обновлено"), ...errs(401, 403) },
        },
      },

      // ============ ADMIN ============
      "/api/admin/dashboard": {
        get: {
          tags: ["Admin"],
          summary: "Дашборд: статистика и графики",
          security: [{ cookieAuth: [], adminToken: [] }],
          responses: { ...ok("Счётчики + регистрации/активность по дням"), ...errs(401, 403) },
        },
      },
      "/api/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "Список пользователей (поиск, фильтр по роли)",
          security: [{ cookieAuth: [], adminToken: [] }],
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "role", in: "query", schema: { type: "string", enum: ["student", "teacher", "admin"] } },
            ...pageParams,
          ],
          responses: { ...ok("Paginated пользователи со статистикой"), ...errs(401, 403) },
        },
        put: {
          tags: ["Admin"],
          summary: "Изменить роль/блокировку/имя пользователя",
          security: [{ cookieAuth: [], adminToken: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["id"],
                  properties: {
                    id: { type: "string" },
                    role: { type: "string", enum: ["student", "teacher", "admin"] },
                    isActive: { type: "boolean" },
                    fullName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { ...ok("Пользователь обновлён, AuditLog записан"), ...errs(400, 401, 403) },
        },
      },
      "/api/admin/users/{id}/reset-password": {
        post: {
          tags: ["Admin"],
          summary: "Ручной сброс пароля пользователя",
          description: "Генерирует новый случайный пароль и возвращает его один раз. Факт фиксируется в AuditLog.",
          security: [{ cookieAuth: [], adminToken: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("{password, email} — показать один раз"), ...errs(401, 403, 404) },
        },
      },
      "/api/admin/moderation": {
        get: {
          tags: ["Admin"],
          summary: "Очередь модерации модулей",
          security: [{ cookieAuth: [], adminToken: [] }],
          responses: { ...ok("Модули в статусе on_moderation"), ...errs(401, 403) },
        },
        put: {
          tags: ["Admin"],
          summary: "Решение по модулю (publish/reject)",
          security: [{ cookieAuth: [], adminToken: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["moduleId", "action"],
                  properties: {
                    moduleId: { type: "string" },
                    action: { type: "string", enum: ["publish", "reject"] },
                    comment: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { ...ok("Статус модуля обновлён, ModerationLog записан"), ...errs(400, 401, 403, 404) },
        },
      },

      // ============ TEACHER ============
      "/api/teacher/modules": {
        get: {
          tags: ["Teacher"],
          summary: "Модули преподавателя (все статусы)",
          security: auth,
          responses: { ...ok("Модули с последним решением модерации"), ...errs(401, 403) },
        },
        post: {
          tags: ["Teacher"],
          summary: "Создать модуль",
          security: auth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "level"],
                  properties: {
                    title: { type: "string", minLength: 3 },
                    description: { type: "string" },
                    level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                    coverColor: { type: "string" },
                    estimatedMin: { type: "integer" },
                    categories: { type: "array", items: { type: "string" } },
                    status: { type: "string", enum: ["draft", "on_moderation"] },
                  },
                },
              },
            },
          },
          responses: { ...ok("Модуль создан"), ...errs(400, 401, 403) },
        },
      },
      "/api/teacher/modules/{id}": {
        put: {
          tags: ["Teacher"],
          summary: "Обновить модуль (владелец или admin)",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Модуль обновлён"), ...errs(400, 401, 403, 404) },
        },
        delete: {
          tags: ["Teacher"],
          summary: "Мягкое удаление модуля (soft delete)",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("deletedAt установлен, статус archived"), ...errs(401, 403, 404) },
        },
      },
      "/api/teacher/modules/{id}/lessons": {
        get: {
          tags: ["Teacher"],
          summary: "Уроки модуля",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Уроки модуля"), ...errs(401, 403, 404) },
        },
        post: {
          tags: ["Teacher"],
          summary: "Создать урок в модуле",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Урок создан"), ...errs(400, 401, 403) },
        },
      },
      "/api/teacher/lessons/{id}": {
        put: {
          tags: ["Teacher"],
          summary: "Обновить урок",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Урок обновлён"), ...errs(400, 401, 403, 404) },
        },
        delete: {
          tags: ["Teacher"],
          summary: "Мягкое удаление урока",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("deletedAt установлен"), ...errs(401, 403, 404) },
        },
      },
      "/api/teacher/lessons/{id}/vocabulary": {
        get: {
          tags: ["Teacher"],
          summary: "Словарь урока",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Слова урока"), ...errs(401, 403, 404) },
        },
        post: {
          tags: ["Teacher"],
          summary: "Добавить слово в урок",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Слово добавлено"), ...errs(400, 401, 403) },
        },
      },
      "/api/teacher/vocabulary/{id}": {
        put: {
          tags: ["Teacher"],
          summary: "Обновить слово",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Слово обновлено"), ...errs(400, 401, 403, 404) },
        },
        delete: {
          tags: ["Teacher"],
          summary: "Мягкое удаление слова",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("deletedAt установлен"), ...errs(401, 403, 404) },
        },
      },
      "/api/teacher/lessons/{id}/exercises": {
        get: {
          tags: ["Teacher"],
          summary: "Упражнения урока (с ответами)",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Упражнения с correctAnswer"), ...errs(401, 403, 404) },
        },
        post: {
          tags: ["Teacher"],
          summary: "Создать упражнение",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Упражнение создано"), ...errs(400, 401, 403) },
        },
      },
      "/api/teacher/exercises/{id}": {
        put: {
          tags: ["Teacher"],
          summary: "Обновить упражнение",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("Упражнение обновлено"), ...errs(400, 401, 403, 404) },
        },
        delete: {
          tags: ["Teacher"],
          summary: "Мягкое удаление упражнения",
          security: auth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { ...ok("deletedAt установлен"), ...errs(401, 403, 404) },
        },
      },
      "/api/teacher/analytics": {
        get: {
          tags: ["Teacher"],
          summary: "Аналитика преподавателя",
          security: auth,
          responses: { ...ok("Статистика модулей/уроков/учеников"), ...errs(401, 403) },
        },
      },

      // ============ SYSTEM ============
      "/api": {
        get: {
          tags: ["System"],
          summary: "Корень API",
          responses: ok("Информация об API"),
        },
      },
      "/api/settings": {
        get: {
          tags: ["System"],
          summary: "Настройки пользователя",
          security: auth,
          responses: { ...ok("Настройки (тема, TTS-голос, дневная цель)"), ...errs(401) },
        },
      },
      "/api/seed": {
        post: {
          tags: ["System"],
          summary: "Наполнение БД демо-данными",
          description: "Создаёт модули, уроки, слова, достижения и демо-пользователей. Идемпотентен.",
          responses: ok("Seed выполнен"),
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["System"],
          summary: "Эта OpenAPI-спецификация",
          responses: ok("OpenAPI 3.0 JSON"),
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
