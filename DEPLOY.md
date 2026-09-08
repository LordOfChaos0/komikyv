# Развёртывание «Коми кыв» на виртуальной машине

Пошаговое руководство для тестового запуска платформы на чистой VM
(Ubuntu Server 22.04/24.04) и последующего перевода в production.

---

## 1. Требования к VM

| Параметр | Минимум для теста | Рекомендуется |
|----------|-------------------|---------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1.5 ГБ (build не влезет — собирайте локально или со swap) | 2–4 ГБ |
| Диск | 10 ГБ | 20 ГБ |
| ОС | Ubuntu 22.04 / 24.04 LTS | то же |
| Доступ | SSH | SSH + открытые 80/443 |

> **Важно про память:** `next build` потребляет ~2 ГБ RAM. На VM с 1.5 ГБ
> создайте swap (раздел 5.3) или собирайте проект на своей машине и
> переносите `.next/standalone` + `.next/static`.

### Порты
- `22` — SSH
- `80`, `443` — HTTP/HTTPS (Caddy)
- `3000` — приложение (НЕ открывать наружу, Caddy проксирует сам)

---

## 2. Быстрый старт (тест за ~10 минут)

Зайдите на VM по SSH и выполните:

```bash
# 1) Обновление системы
sudo apt update && sudo apt upgrade -y

# 2) Установка Bun (менеджер пакетов и рантайм)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version   # должен показать 1.x

# 3) Установка git
sudo apt install -y git

# 4) Клонирование проекта
#    (после публикации репозитория — см. раздел 8)
git clone https://github.com/<ВАШ_ЛОГИН>/komikyv.git
cd komikyv

# 5) Настройка окружения
cp .env.example .env
nano .env        # заполните значения — см. раздел 3

# 6) Установка зависимостей и генерация Prisma-клиента
bun install
bunx prisma generate

# 7) Сборка
bun run build

# 8) Запуск (тестовый режим, порт 3000)
cd .next/standalone
cp -r ../../.next/static .next/
cp -r ../../public .
node server.js
```

Откройте в браузере `http://<IP-VM>:3000` — если порт 3000 закрыт файрволом
(и это правильно!), временно откройте его:

```bash
sudo ufw allow 3000/tcp   # только для теста, потом закрыть
```

---

## 3. Конфигурация `.env`

```bash
cp .env.example .env
```

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `DATABASE_URL` | да | `file:/var/www/komikyv/db/custom.db` (абсолютный путь!) |
| `JWT_SECRET` | **да в production** | `openssl rand -hex 32` — без неё приложение не стартует |
| `ADMIN_ACCESS_TOKEN` | нет | Доп. токен для /api/admin/* (`openssl rand -hex 16`) — см. §3.1 |
| `ALLOWED_ORIGINS` | нет | Кросс-доменные origin через запятую — см. §3.1 |
| `SMTP_HOST/PORT/USER/PASS/FROM` | нет | Яндекс SMTP: восстановление пароля и подтверждение email |
| `YANDEX_CLIENT_ID/SECRET` | нет | OAuth-вход через Яндекс ID |
| `APP_URL` | нет | `https://комикыв.рф` — для OAuth redirect URI (в punycode: https://xn--b1alfbil8g.xn--p1ai) |
| `METRIKA_ID` | нет | Номер счётчика Яндекс.Метрики — подключение без пересборки (§13) |

### 3.1. ADMIN_ACCESS_TOKEN и ALLOWED_ORIGINS — что защищают

**`ADMIN_ACCESS_TOKEN`** — второй слой защиты админ-API (`/api/admin/*`).
Работает ВМЕСТЕ с ролями (RBAC), а не вместо: пользователь всё равно
должен быть залогинен с ролью администратора, но если переменная
задана — каждый запрос к админ-API дополнительно обязан нести
заголовок `X-Admin-Token` с точным совпадением значения.

- **От чего защищает:** угнанную сессию (украденные cookies сами по
  себе не дают доступ к админ-API — нужен ещё и токен) и XSS
  (вредоносный скрипт в браузере не знает значения).
- **Как включить:** `openssl rand -hex 16` → вписать в `.env` →
  перезапустить сервис. При входе в админ-панель появится диалог
  «Токен администратора»: значение вводится один раз и сохраняется
  только в том браузере.
- **Пусто (по умолчанию)** — проверка выключена, доступ определяется
  только ролью. Для прода задать настоятельно рекомендуется.

**`ALLOWED_ORIGINS`** — белый список источников для кросс-доменных
запросов к API из браузера (CORS).

- **Пусто (по умолчанию)** = API доступно только со страниц самого
  сайта (same-origin): чужие сайты в браузере не смогут читать
  ответы API с куками пользователя — заголовки
  `Access-Control-Allow-Origin` не выдаются.
- **Когда задавать:** если появится мобильное приложение, второй
  фронтенд на другом домене или сторонняя интеграция, которым нужен
  доступ к API из браузера: `ALLOWED_ORIGINS=https://app.example.ru`
  (через запятую для нескольких).
- **Важно понимать:** CORS — механизм браузерный. Серверные клиенты
  (curl, бэкенды) этим ограничением не затрагиваются — для них API
  доступно всегда (защита — авторизация и роли, не CORS).

Минимальный `.env` для теста:

```env
DATABASE_URL=file:/home/user/komikyv/db/custom.db
JWT_SECRET=<результат openssl rand -hex 32>
```

SMTP и OAuth можно не настраивать — восстановление пароля в dev-режиме
выведет код в консоль сервера (удобно для тестов).

---

## 4. Swap для VM с малым объёмом памяти

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # проверка: Swap должен показать 2.0Gi
```

---

## 5. Автозапуск через systemd (production-режим)

```bash
sudo tee /etc/systemd/system/komikyv.service > /dev/null <<'EOF'
[Unit]
Description=Komi Kyv — Next.js standalone server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/komikyv/.next/standalone
ExecStart=/usr/bin/env node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
# переменные из .env подхватываются Next.js автоматически из
# WorkingDirectory/.env — авто-деплой копирует туда .env из корня репозитория;
# при ручной сборке скопируйте сами: cp .env .next/standalone/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now komikyv
sudo systemctl status komikyv   # Active: active (running)
```

Логи:

```bash
journalctl -u komikyv -f          # живой поток
journalctl -u komikyv --since today
```

---

## 6. Caddy: HTTPS и обратный прокси

Caddy автоматически получает SSL-сертификаты Let's Encrypt.

### 6.1. Установка

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 6.2. Конфигурация

Готовый `Caddyfile` для домена **комикыв.рф** уже лежит в корне репозитория:

```bash
sudo cp ~/komikyv/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Ручной вариант (если нужно):

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
комикыв.рф {
    encode gzip zstd
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
EOF
sudo systemctl reload caddy
```

> Кириллический домен в Caddyfile можно писать кириллицей — Caddy
> сам преобразует в punycode (`комикыв.рф` → `xn--b1alfbil8g.xn--p1ai`).

**Требования для выпуска сертификата Let's Encrypt:**

1. A-запись DNS: `комикыв.рф` → IP сервера
2. Порты 80 и 443 открыты в файрволе и свободны (никаких nginx/apache)
3. Caddy запущен от имени пользователя с правами на 80/443

Caddy автоматически получит сертификат при первом обращении
> (проверка HTTP-01). Процесс занимает ~10 секунд после
> корректной DNS-записи. Сертификаты продлеваются автоматически.

Только по IP, без домена (самоподписанный сертификат — для чистого теста):

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
:80 {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
EOF
sudo systemctl reload caddy
```

### 6.3. Файрвол

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Приложение доступно по **`https://комикыв.рф`** (или `http://<IP>` для теста).

---

## 7. Проверка после развёртывания

| Что проверяем | Как |
|---------------|-----|
| Приложение живо | `curl -I https://комикыв.рф` → HTTP 200 |
| Security-заголовки | `curl -I https://комикыв.рф` → CSP, HSTS, X-Frame-Options |
| API-документация | Открыть `https://комикыв.рф/api-docs` — Swagger UI |
| Логин | `student@komikyv.ru` / `Student123!` |
| Админка | `admin@komikyv.ru` / `Admin123!` |
| Страница 404 | `https://комикыв.рф/абракадабра` — «Страница не найдена» |
| Rate limit | 6 неудачных логинов подряд → 429 |
| CSRF | POST без заголовка X-CSRF-Token → 403 |

> **После тестов обязательно смените пароли демо-аккаунтов**
> (раздел «Пользователи» в админ-панели) и задайте `ADMIN_ACCESS_TOKEN`.

---

## 8. Публикация на GitHub и авто-деплой

### 8.1. Пуш репозитория (с вашей машины)

```bash
cd komikyv
git remote add origin https://github.com/<ЛОГИН>/komikyv.git
git push -u origin main
git push -u origin develop
```

### 8.2. Автоматический деплой при пуше в main

Файл `.github/workflows/deploy.yml` уже настроен. В настройках репозитория
GitHub → Settings → Secrets and variables → Actions добавьте:

| Secret | Значение |
|--------|----------|
| `SSH_HOST` | IP или домен VM |
| `SSH_USER` | пользователь SSH (например, `ubuntu`) |
| `SSH_PRIVATE_KEY` | приватный ключ (`cat ~/.ssh/id_rsa`) |
| `SSH_PATH` | путь к проекту на VM (`/home/ubuntu/komikyv`) |

Также на VM разрешите деплой-ключу sudo без пароля для перезапуска сервиса:

```bash
sudo visudo -f /etc/sudoers.d/komikyv-deploy
# добавьте строку:
ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart komikyv
```

Теперь каждый `git push origin main` → CI соберёт проект на VM и
перезапустит сервис. CI (линт + typecheck + build) гоняется на каждый PR.

> **Проверьте, что деплой реально выполняется.** Пока секреты не заданы,
> workflow завершается зелёным `success` за ~10 секунд, а шаг
> «Деплой (git pull…)» помечается `skipped` (так задумано — не портить
> историю запусков). Живой деплой занимает минуты: после настройки
> откройте Actions → Deploy → последний запуск и убедитесь, что шаг
> «Деплой» — `success`, а не `skipped`.

### 8.2.1. Включение 2FA для администратора (после обновления)

1. Войдите под учётной записью администратора.
2. «Настройки» → карточка «Безопасность» → «Включить двухфакторную
   аутентификацию».
3. Отсканируйте QR-код приложением-аутентификатором (Google
   Authenticator, Яндекс.Ключ, Aegis) или введите секрет вручную.
4. Введите шестизначный код из приложения для подтверждения.

Раздел «База данных» в админ-панели требует активной 2FA-сессии: без
второго фактора редактирование записей недоступно (только чтение).

### 8.3. Обновление вручную (без CI)

```bash
cd ~/komikyv
git pull origin main
bun install
bunx prisma generate
bunx prisma db push        # применить изменения схемы (напр., поля 2FA в User)
bun run build
# ВАЖНО: standalone-сервер читает env только из .next/standalone,
# а build пересоздаёт каталог — копируем .env ПОСЛЕ сборки:
cp .env .next/standalone/.env
cd .next/standalone && cp -r ../../.next/static .next/ && cp -r ../../public .
cd ~/komikyv
sudo systemctl restart komikyv
```

> **Важно:** шаг `bunx prisma db push` обязателен при обновлении до версии
> с админ-панелью и 2FA — в таблицу `User` добавляются колонки
> `totp_secret`, `totp_enabled`, `totp_last_code`. Без этого все запросы к
> пользователям (вход, профиль) вернут ошибку `no such column`.
> `db push` не стирает данные: новые колонки добавляются с `NULL`/`false`.

---

## 9. База данных

SQLite-файл `db/custom.db` уже содержит демо-данные:
4 модуля, 8 уроков, 34 упражнения, 84 слова, 12 достижений,
3 демо-пользователя.

Сброс/перегенерация:

```bash
# Полный пересид (удалит прогресс пользователей!)
curl -X POST http://localhost:3000/api/seed
```

Бэкап (добавьте в cron):

```bash
0 3 * * * sqlite3 /home/ubuntu/komikyv/db/custom.db ".backup /backup/komikyv-$(date +\%F).db"
```

---

## 10. Частые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| `Killed` при `bun run build` | Не хватает RAM | Создать swap (раздел 4) |
| Приложение падает на старте с ошибкой JWT_SECRET | Не задан секрет в production | `openssl rand -hex 32` → `.env` |
| 502 Bad Gateway от Caddy | Приложение не запущено | `systemctl status komikyv` |
| Пустая БД / ошибка Prisma | Неверный путь в DATABASE_URL | Абсолютный путь: `file:/home/.../db/custom.db` |
| Письма не приходят | SMTP не настроен | Код смотрится в логах: `journalctl -u komikyv \| grep "DEV MODE"` |
| CSRF 403 на всех POST | Часы VM сбиты / куки очищены | `timedatectl set-ntp on`, обновить страницу |
| OAuth кнопка не появляется | Не заданы YANDEX_* | Заполнить `.env`, перезапустить сервис |
| `git pull` на VM: «local changes to db/custom.db would be overwritten» | Живая БД пишется внутри дерева репозитория | Одноразовая миграция — раздел 11 |

---

## 11. Перенос рабочей БД из дерева репозитория (одноразовая миграция)

Демо-база `db/custom.db` лежит в репозитории (нужна CI для пререндера),
но на VM она становится **живой** базой: приложение пишет в неё регистрации,
прогресс, аудит-логи. При push'е новой версии демо-базы `git pull`
завершается ошибкой:

```text
error: Your local changes to the following files would be overwritten by merge:
        db/custom.db
Please commit your changes or stash them before you merge.
```

Это не поломка, а защита: git отказывается затирать живую базу демо-копией.
Решение — один раз вынести рабочую БД за пределы дерева репозитория
(например, `/var/lib/komikyv/custom.db`). После этого конфликты невозможны:
`db/custom.db` в репо остаётся демо-копией для CI и свежих установок,
а живая база живёт своей жизнью.

Выполняется на VM (пример для root; при другом пользователе — через sudo):

```bash
cd ~/komikyv                                # путь к проекту на вашей VM

# 1. Остановить сервис: SQLite корректно закроет файл (WAL-журнал уйдёт в основной файл)
systemctl stop komikyv

# 2. Бэкап живой БД + перенос вне дерева репозитория
mkdir -p /var/lib/komikyv
cp db/custom.db "/var/lib/komikyv/custom.db.bak-$(date +%F-%H%M)"
mv db/custom.db /var/lib/komikyv/custom.db
ls db/   # если остались custom.db-wal / custom.db-shm — скопируйте их тоже
         # (обычно systemd-стоп сам подчищает WAL)

# 3. Вернуть демо-копию из HEAD — git снова видит чистое дерево
git checkout -- db/custom.db
git status                                 # «nothing to commit, working tree clean»

# 4. Забрать обновления (багфиксы, CI/CD, документация) — теперь без конфликтов
git pull origin main

# 5. Перевести приложение на новую БД (абсолютный путь — см. раздел 10)
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:/var/lib/komikyv/custom.db|' .env
grep '^DATABASE_URL' .env                  # убедиться в результате

# 6. Схема живой БД догоняет новый код (additive-изменения, данные не трогаются)
export PATH="$HOME/.bun/bin:$PATH"         # bun не всегда виден в non-interactive shell
bun install
bunx prisma generate
bunx prisma db push

# 7. Пересборка + синхронизация .env с runtime + запуск
bun run build
# сервис читает .env из WorkingDirectory (.next/standalone) — синхронизируем:
if [ -f .next/standalone/.env ]; then
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:/var/lib/komikyv/custom.db|' .next/standalone/.env
else
  cp .env .next/standalone/.env
fi
systemctl start komikyv
systemctl is-active komikyv && journalctl -u komikyv -n 5 --no-pager
```

Если сервис работает не от root (`systemctl cat komikyv | grep '^User='`),
отдайте ему файлы: `chown -R <этот_пользователь> /var/lib/komikyv`.

После миграции:

- `git pull` (ручной и авто-деплой из `deploy.yml`) больше никогда не конфликтует;
- бэкап-крон из раздела 9 переключите на новый путь:
  `sqlite3 /var/lib/komikyv/custom.db ".backup /backup/komikyv-$(date +\%F).db"`.

---

## 12. ASR / TTS / LLM — AI-провайдеры (z.ai, OpenAI-совместимые, Yandex SpeechKit)

Тренажёр диалогов (LLM), озвучка слов (TTS) и анализ произношения (ASR)
работают через единый слой `src/lib/ai-providers.ts`. Провайдер выбирается
**отдельно для каждой функции** (можно смешивать, например TTS от Яндекса,
ASR от z.ai, LLM от OpenAI) переменными из `.env`:

```env
AI_TTS_PROVIDER=zai      # zai | openai | yandex
AI_ASR_PROVIDER=zai      # zai | openai | yandex
AI_CHAT_PROVIDER=zai     # zai | openai
```

Не заданы — везде `zai` (как в песочнице, работает из коробки).

> **На VM в production-режиме** переменные достаточно держать в `.env`
> репозитория (корень проекта): авто-деплой копирует его в
> `.next/standalone/.env` после сборки. При РУЧНОЙ сборке (`bun run build`)
> скопируйте сами: `cp .env .next/standalone/.env` — standalone-каталог
> пересоздаётся каждой сборкой.

### 12.1. zai (по умолчанию)

Конфиг `.z-ai-config` (JSON) ищется по порядку: CWD процесса
(на VM это `.next/standalone` — **не кладите туда**, пересоздаётся при
каждой сборке) → `~/.z-ai-config` → `/etc/.z-ai-config` (**рекомендуется**).

```json
{ "baseUrl": "https://api.z.ai/api/paas/v4", "apiKey": "<ваш ключ>" }
```

В песочнице конфиг выдан окружением в `/etc/.z-ai-config`.
Модель LLM — переменная `LLM_MODEL` (по умолчанию `qwen3.8-flash`).

### 12.2. openai — любой OpenAI-совместимый API

OpenAI, Groq, OpenRouter (только чат), LocalAI, vLLM, а также self-hosted
whisper-серверы (speaches, faster-whisper-server). Это же — способ работать
с **локальными моделями без внешних ключей**.

```env
AI_OPENAI_BASE_URL=https://api.openai.com/v1
AI_OPENAI_API_KEY=sk-...
AI_TTS_MODEL=tts-1            # голоса: alloy, echo, fable, onyx, nova, shimmer
AI_TTS_VOICE=alloy
AI_ASR_MODEL=whisper-1        # у Groq: whisper-large-v3
LLM_MODEL=gpt-4o-mini         # при AI_CHAT_PROVIDER=openai
```

Пути при необходимости переопределяются: `AI_TTS_PATH` (умолч.
`/audio/speech`), `AI_ASR_PATH` (`/audio/transcriptions`),
`AI_CHAT_PATH` (`/chat/completions`). Локальный whisper-сервер только для
ASR подключается через отдельный `AI_ASR_BASE_URL` (см. §12.5) — TTS и
LLM при этом остаются на внешнем шлюзе.

Готовый пример — агрегатор **aitunnel.ru** (один ключ на LLM + TTS + ASR,
модели из его каталога):

```env
AI_TTS_PROVIDER=openai
AI_ASR_PROVIDER=openai
AI_CHAT_PROVIDER=openai
AI_OPENAI_BASE_URL=https://api.aitunnel.ru/v1
AI_OPENAI_API_KEY=sk-aitunnel-<ваш ключ>
AI_TTS_MODEL=gpt-audio-mini
AI_TTS_VOICE=alloy
AI_ASR_MODEL=gemini-3.1-flash-lite
LLM_MODEL=gemma-4-26b-a4b-it
```

Особенности этих моделей уже учтены в коде (обрабатывается автоматически):

- **Gemma** не принимает `role: system` — при ошибке 400 системный промпт
  тренажёра вливается в первый user-тик и запрос повторяется;
- **gpt-audio-mini** у части шлюзов не принимает `speed` (или
  `response_format`) — запрос автоматически упрощается и повторяется;
- голос z.ai `tongtong` подменяется на `AI_TTS_VOICE` (`alloy` по умолчанию);
  голоса gpt-audio: alloy, ash, ballad, coral, echo, fable, onyx, nova,
  sage, shimmer.

### 12.3. yandex — Yandex SpeechKit

```env
AI_YANDEX_API_KEY=<ключ API из консоли Yandex Cloud>
AI_YANDEX_FOLDER_ID=<folderId>
AI_YANDEX_TTS_VOICE=alena     # alena, filipp, marina, polly, ermil, zahar…
AI_YANDEX_LANG=ru-RU
```

TTS (v2 REST) возвращает lpcm — сервер сам оборачивает в WAV.
ASR (v2 REST) принимает только OggOpus: записи браузера (webm/opus)
**переконтейнируются через ffmpeg** — на VM нужен
`apt install ffmpeg` (кодек не перекодируется, быстро).
Работа через прокси: `AI_YANDEX_TTS_URL` / `AI_YANDEX_ASR_URL`.

### 12.4. Проверка (на VM, API требует авторизации)

Сначала — быстрый тест ключа прямо в шлюз (без приложения; подставьте
свой ключ и модели):

```bash
source .env
curl -s "$AI_OPENAI_BASE_URL/chat/completions" \
  -H "Authorization: Bearer $AI_OPENAI_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"gemma-4-26b-a4b-it","messages":[{"role":"user","content":"привет"}]}' | head -c 300
curl -s "$AI_OPENAI_BASE_URL/audio/speech" \
  -H "Authorization: Bearer $AI_OPENAI_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"gpt-audio-mini","input":"Бур","voice":"alloy","response_format":"wav"}' \
  --output /tmp/t.wav && file /tmp/t.wav   # должно быть WAV/RIFF
```

Затем — через приложение:

```bash
curl -s -c /tmp/c.txt -o /dev/null http://localhost:3000/api/auth/me   # получить CSRF-куку
CSRF=$(awk '$6=="komi_csrf" {print $7}' /tmp/c.txt)
curl -s -b /tmp/c.txt -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"student@komikyv.ru","password":"ПАРОЛЬ_ДЕМО"}'
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/tts \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF" \
  -d '{"text":"Бур"}' | head -c 120
# нормальный ответ начинается с: {"audio":"data:audio/wav;base64,UklGR...
journalctl -u komikyv | grep -E "TTS error|ASR error"   # диагностика ошибок
```

### 12.5. Распознавание коми речи (ASR)

Готового языка «коми» (ISO `kv`) **нет ни у одного провайдера**: Whisper
знает ~99 языков без коми, Yandex SpeechKit — ru/en/kk и т.д., Gemini —
тоже без коми. Переключателя «язык = коми» не существует — вместо этого
в приложении работают два механизма.

**1. Подсказка ожидаемой фразы (contextual biasing) — включена по умолчанию.**
Тренажёр произношения заранее знает целевое слово упражнения (фронтенд
присылает его как `target`). Сервер передаёт его провайдеру в поле
`prompt` — его поддерживают Whisper-совместимые API и LLM-ASR
(gpt-4o-transcribe, Gemini): декодер не «сваливается» в русскую
орфографию и транскрибирует коми буквами (ӧ, ы, і…). Это стандартный
приём тренажёров произношения для низкоресурсных языков.

Выключается, если покажется, что ASR «подсказывает ответ»:

```env
AI_ASR_HINT=0
```

Перед сравнением по Левенштейну обе строки нормализуются: убирается
пунктуация, схлопываются пробелы и буквы і/и (ASR их практически не
различает). Реальные ошибки в ӧ, ы и остальных буквах продолжают
снижать точность. Опциональный код языка — `AI_ASR_LANGUAGE`
(для коми кода нет, поле для экспериментов; пусто = автоопределение).

**2. Отдельный ASR-эндпоинт — для «настоящего» коми-Whisper.**
ASR можно направить на другой сервер, не трогая TTS и LLM (они
остаются, например, на aitunnel):

```env
AI_ASR_PROVIDER=openai
AI_ASR_BASE_URL=http://127.0.0.1:9000/v1   # локальный whisper-сервер
AI_ASR_MODEL=<имя дообученной на коми модели>
```

Отдельный URL = отдельные учётные данные: ключ общего шлюза туда
**не отправляется**; если серверу нужна авторизация — задайте
`AI_ASR_API_KEY`. Для localhost/частных адресов без ключа работает
вообще без `Authorization`.

Сценарий: дообучить Whisper на коми-речи и поднять OpenAI-совместимый
сервер (speaches, faster-whisper-server, `whisper.cpp server`). Учтите:
открытых датасетов коми-речи практически нет (Common Voice коми не
содержит) — данные придётся собирать самостоятельно (записи
носителей/учителей + выравнивание текста).

Совместимость: zai (SDK) и Yandex SpeechKit v2 подсказку `prompt` не
принимают — там biasing просто не действует, поведение не меняется.
Строгие шлюзы, отвергающие `prompt`/`language` (HTTP 400/422),
автоматически получают повтор без них — как TTS-адаптер упрощает запрос.

Ограничения (важно понимать):

- коми-голосов нет ни у одного провайдера: озвучка фонетическая
  (zai — `tongtong`, OpenAI — `alloy`…, Yandex — `alena`…);
- ASR «транскрибирует как слышит» — с коми-подсказкой (§12.5) он
  транскрибирует коми буквами; точность считается по расстоянию Левенштейна
  к целевому слову — методика не зависит от провайдера;
- озвучка слов словаря кэшируется в БД (`vocabulary.audioBase64`) —
  повторные прослушивания не тратят API, кэш переживёт смену провайдера
  (формат WAV одинаков у всех).

## 13. Яндекс.Метрика

Счётчик подключается **без пересборки и без изменения кода** — достаточно
номера счётчика в `.env` и перезапуска сервиса.

### 13.1. Подключение

1. Создайте счётчик: https://metrika.yandex.ru → «Добавить счётчик»,
   имя — произвольное (например, «Коми кыв»), адрес —
   `https://комикыв.рф`. Убедитесь, что включены «Вебвизор» и «Карта
   кликов» (по умолчанию включены).
2. Скопируйте номер счётчика (число в списке счётчиков, рядом с именем).
3. На VM добавьте в `.env` (корень репозитория):

```env
METRIKA_ID=12345678
```

4. Перезапустите сервис: `sudo systemctl restart komikyv`.
   Пересборка (`bun run build`) НЕ нужна: сниппет генерируется роутом
   `/metrika.js` при запросе, ID читается из env в рантайме. Плюс
   деплой больше не затирает настройку — `.env` остаётся на месте.
   Внимание: `.next/standalone/.env` деплой пересоздаёт из репо-`.env`,
   правьте только корневой файл.

### 13.2. Как это работает

- В `head` каждой страницы подключается `/metrika.js` — серверный роут,
  который отдаёт официальный асинхронный сниппет tag.js с вашим ID
  (clickmap, trackLinks, accurateTrackBounce, webvisor).
- Метрика не настроена (переменная пуста) — роут отдаёт безвредный
  комментарий, сайт ничего не грузит с Яндекса.
- CSP уже разрешает `mc.yandex.ru` в `script-src`, `connect-src`,
  `img-src` — ничего дополнительно настраивать не нужно.
- SPA-навигация (переходы по разделам без перезагрузки) отслеживается
  tag.js автоматически через History API.
- Без JavaScript метрика не считается (noscript-фолбэк не ставится —
  JS отключён у доли процента посетителей).

### 13.3. Проверка

```bash
curl -s https://комикыв.рф/metrika.js | head -3   # сниппет с вашим ID
```

Затем откройте сайт, зайдите в Метрику: «Отчёты → Посещаемость» —
включите режим реального времени (иконка «Онлайн»), ваше посещение
должно появиться. Кликните по паре разделов сайта — просмотры в
визите должны увеличиться (значит, SPA-навигация считается). Если
данные не доходят: DevTools (F12) → Network → фильтр `mc.yandex.ru`
— запросы `watch` должны уходить со статусом 200.

### 13.4. Если «не подключилось» — диагностика по убыванию вероятности

1. **Блокировщик рекламы в вашем браузере** (uBlock Origin, AdGuard)
   блокирует `mc.yandex.ru` — ваши собственные визиты не считаются,
   хотя счётчик работает. Проверьте сайт в режиме инкогнито с
   выключенными расширениями (или в Яндекс.Браузере — он Метрику
   не режет).
2. **Смотрите не тот отчёт.** «Посещаемость» обновляется с задержкой
   до ~30 минут; для мгновенной проверки — «Отчёты в реальном
   времени» (иконка «Онлайн» в левой панели).
3. **Счётчик не ваш.** Сверьте ID из `.env` со списком счётчиков
   (адрес страницы счётчика в интерфейсе:
   `metrika.yandex.ru/dashboard?id=<METRIKA_ID>`). Опечатка в ID
   отправляет данные в чужой счётчик — в вашем будет «данные не
   поступали».
4. **Плашка «Код счётчика не установлен на странице».** Авто-валидатор
   Метрики ищет сниппет прямо в HTML, а здесь он в отдельном файле
   `/metrika.js` (намеренно — чтобы менять ID без пересборки).
   Плашка косметическая: как только первые хиты приходят, состояние
   счётчика переключается на «Данные поступают».
5. **Сквозной тест без браузера** (полезен и с VM):

```bash
# Должно вернуть GIF89a и HTTP 200 (счётчик существует и принял hit):
curl -sL -o /dev/null -w "%{http_code}\n" -X POST \
  "https://mc.yandex.ru/watch/$METRIKA_ID" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "Origin: https://комикыв.рф" -H "Referer: https://комикыв.рф/" \
  --data "page-url=https%3A%2F%2Fкомикыв.рф%2F&browser-info=j%3A1"
# Несуществующий ID вернёт 404 «Invalid watch args» — так видно,
# что точный номер счётчика имеет значение.
```

Такой hit появится в отчётах с адресом главной страницы; при
желании добавьте `page-title=...` (URL-encoded) для узнаваемого
заголовка в «Содержание → По заголовкам».
